// routes/assetRoutes.js
const express = require('express');
const router = express.Router();
const Busboy = require('busboy');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

module.exports = (db, admin, assetsCollection, usersCollection, clientsCollection, authenticateToken, checkRole) => {

    // Helper function to check if user can access asset
    const canAccessAsset = async (user, asset) => {
        if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'site_admin') {
            return true;
        }
        if (user.role === 'user' && asset.owner_uid === user.uid) {
            return true;
        }
        if (asset.client_name && user.client_name === asset.client_name) {
            return true;
        }
        return false;
    };

    // @route   GET /api/assets
    // @desc    Get all assets (filtered by role)
    // @access  Private
    router.get('/', authenticateToken, async (req, res) => {
        try {
            let query = assetsCollection;
            const filters = {};

            // Role-based filtering
            if (req.user.role === 'user') {
                // Users can only see their own assets
                query = query.where('owner_uid', '==', req.user.uid);
            } else if (req.user.role === 'site_admin') {
                // Site admins see assets for their client
                if (req.user.client_name) {
                    query = query.where('client_name', '==', req.user.client_name);
                }
            }
            // super_admin and admin can see all assets (no filter)

            // Apply additional filters from query params
            if (req.query.client_name) {
                filters.client_name = req.query.client_name;
            }
            if (req.query.asset_type) {
                filters.asset_type = req.query.asset_type; // 'hardware' or 'software'
            }
            if (req.query.status) {
                filters.status = req.query.status;
            }
            if (req.query.owner_uid) {
                filters.owner_uid = req.query.owner_uid;
            }

            // Apply filters to query (Firestore allows multiple where clauses)
            // Note: For complex queries, you may need composite indexes
            if (filters.client_name) {
                query = query.where('client_name', '==', filters.client_name);
            }
            if (filters.asset_type) {
                query = query.where('asset_type', '==', filters.asset_type);
            }
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }
            if (filters.owner_uid) {
                query = query.where('owner_uid', '==', filters.owner_uid);
            }

            const snapshot = await query.get();
            let assets = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
                updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at,
                warranty_start: doc.data().warranty_start?.toDate?.()?.toISOString() || doc.data().warranty_start,
                warranty_end: doc.data().warranty_end?.toDate?.()?.toISOString() || doc.data().warranty_end,
                subscription_start: doc.data().subscription_start?.toDate?.()?.toISOString() || doc.data().subscription_start,
                subscription_end: doc.data().subscription_end?.toDate?.()?.toISOString() || doc.data().subscription_end,
            }));

            // Fetch user names for owner_uid - OPTIMIZED: Batch fetch with limit to prevent too many reads
            const ownerUids = [...new Set(assets.map(a => a.owner_uid).filter(Boolean))];
            const userMap = {};
            if (ownerUids.length > 0) {
                // Use batch get for better performance (Firestore allows up to 10 docs per batch)
                // For larger sets, we'll batch in chunks of 10
                const BATCH_SIZE = 10;
                for (let i = 0; i < ownerUids.length; i += BATCH_SIZE) {
                    const batch = ownerUids.slice(i, i + BATCH_SIZE);
                    const userPromises = batch.map(uid => usersCollection.doc(uid).get());
                    const userDocs = await Promise.all(userPromises);
                    userDocs.forEach((doc, index) => {
                        if (doc.exists) {
                            const userData = doc.data();
                            userMap[batch[index]] = {
                                name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || '',
                                email: userData.email || ''
                            };
                        }
                    });
                }
            }

            // Add owner names to assets
            assets = assets.map(asset => ({
                ...asset,
                owner_name: asset.owner_uid ? (userMap[asset.owner_uid]?.name || userMap[asset.owner_uid]?.email || '') : '',
                owner_email: asset.owner_uid ? (userMap[asset.owner_uid]?.email || '') : ''
            }));

            res.json(assets);
        } catch (error) {
            console.error('Error fetching assets:', error);
            res.status(500).json({ error: 'Failed to fetch assets: ' + error.message });
        }
    });

    // @route   GET /api/assets/summary
    // @desc    Get asset summary statistics (optimized - only fetches needed fields)
    // @access  Private
    router.get('/summary', authenticateToken, async (req, res) => {
        try {
            let query = assetsCollection;

            // Role-based filtering
            if (req.user.role === 'user') {
                query = query.where('owner_uid', '==', req.user.uid);
            } else if (req.user.role === 'site_admin' && req.user.client_name) {
                query = query.where('client_name', '==', req.user.client_name);
            }

            const snapshot = await query.get();
            // Only extract fields needed for summary to reduce processing time
            const assets = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    asset_type: data.asset_type,
                    status: data.status,
                    warranty_end: data.warranty_end,
                    subscription_end: data.subscription_end,
                    risk_level: data.risk_level,
                    flagged: data.flagged
                };
            });

            const now = new Date();
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            const summary = {
                total_assets: assets.length,
                hardware_count: assets.filter(a => a.asset_type === 'hardware').length,
                software_count: assets.filter(a => a.asset_type === 'software').length,
                active_assets: assets.filter(a => a.status === 'Active').length,
                retired_assets: assets.filter(a => a.status === 'Retired').length,
                under_repair: assets.filter(a => a.status === 'Under Repair').length,
                warranty_expiring_soon: assets.filter(a => {
                    if (!a.warranty_end) return false;
                    const endDate = a.warranty_end?.toDate?.() || new Date(a.warranty_end);
                    return endDate <= thirtyDaysFromNow && endDate >= now;
                }).length,
                subscription_renewals_due: assets.filter(a => {
                    if (!a.subscription_end || a.asset_type !== 'software') return false;
                    const endDate = a.subscription_end?.toDate?.() || new Date(a.subscription_end);
                    return endDate <= thirtyDaysFromNow && endDate >= now;
                }).length,
                high_risk_assets: assets.filter(a => a.risk_level === 'High' || a.flagged === true).length,
            };

            res.json(summary);
        } catch (error) {
            console.error('Error fetching asset summary:', error);
            res.status(500).json({ error: 'Failed to fetch asset summary' });
        }
    });

    // @route   GET /api/assets/client-summary
    // @desc    Get asset summary by client (super_admin only) - OPTIMIZED
    // @access  Private (super_admin)
    router.get('/client-summary', authenticateToken, checkRole(['super_admin', 'admin']), async (req, res) => {
        try {
            // Fetch clients and assets in parallel for better performance
            const [clientsSnapshot, assetsSnapshot] = await Promise.all([
                clientsCollection.get(),
                assetsCollection.get()
            ]);
            
            // Only extract fields needed for summary to reduce processing time
            const assets = assetsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    client_name: data.client_name,
                    asset_type: data.asset_type,
                    status: data.status,
                    warranty_end: data.warranty_end,
                    linked_assets: data.linked_assets
                };
            });

            const clientSummaries = clientsSnapshot.docs.map(doc => {
                const clientData = doc.data();
                const clientName = clientData.companyName || doc.id;
                const clientAssets = assets.filter(a => a.client_name === clientName);

                const now = new Date();
                const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                return {
                    client_id: doc.id,
                    client_name: clientName,
                    total_assets: clientAssets.length,
                    hardware_count: clientAssets.filter(a => a.asset_type === 'hardware').length,
                    software_count: clientAssets.filter(a => a.asset_type === 'software').length,
                    linked_assets_count: clientAssets.filter(a => a.linked_assets && a.linked_assets.length > 0).length,
                    warranty_expiring: clientAssets.filter(a => {
                        if (!a.warranty_end) return false;
                        const endDate = a.warranty_end?.toDate?.() || new Date(a.warranty_end);
                        return endDate <= thirtyDaysFromNow && endDate >= now;
                    }).length,
                    active_subscriptions: clientAssets.filter(a => a.asset_type === 'software' && a.status === 'Active').length,
                    engineer_assigned: clientData.engineer_assigned || 'Not assigned',
                };
            });

            res.json(clientSummaries);
        } catch (error) {
            console.error('Error fetching client asset summary:', error);
            res.status(500).json({ error: 'Failed to fetch client asset summary' });
        }
    });

    // @route   GET /api/assets/:id
    // @desc    Get a specific asset
    // @access  Private
    router.get('/:id', authenticateToken, async (req, res) => {
        try {
            const assetDoc = await assetsCollection.doc(req.params.id).get();
            
            if (!assetDoc.exists) {
                return res.status(404).json({ error: 'Asset not found' });
            }

            const asset = {
                id: assetDoc.id,
                ...assetDoc.data(),
                created_at: assetDoc.data().created_at?.toDate?.()?.toISOString() || assetDoc.data().created_at,
                updated_at: assetDoc.data().updated_at?.toDate?.()?.toISOString() || assetDoc.data().updated_at,
                warranty_start: assetDoc.data().warranty_start?.toDate?.()?.toISOString() || assetDoc.data().warranty_start,
                warranty_end: assetDoc.data().warranty_end?.toDate?.()?.toISOString() || assetDoc.data().warranty_end,
                subscription_start: assetDoc.data().subscription_start?.toDate?.()?.toISOString() || assetDoc.data().subscription_start,
                subscription_end: assetDoc.data().subscription_end?.toDate?.()?.toISOString() || assetDoc.data().subscription_end,
            };

            // Check access permission
            const hasAccess = await canAccessAsset(req.user, asset);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied' });
            }

            res.json(asset);
        } catch (error) {
            console.error('Error fetching asset:', error);
            res.status(500).json({ error: 'Failed to fetch asset' });
        }
    });

    // @route   POST /api/assets
    // @desc    Create a new asset
    // @access  Private (admin, super_admin, site_admin)
    router.post('/', authenticateToken, checkRole(['admin', 'super_admin', 'site_admin']), async (req, res) => {
        try {
            const assetData = {
                ...req.body,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                created_by_uid: req.user.uid,
            };

            // Convert date strings to Firestore timestamps
            if (assetData.warranty_start && typeof assetData.warranty_start === 'string') {
                assetData.warranty_start = admin.firestore.Timestamp.fromDate(new Date(assetData.warranty_start));
            }
            if (assetData.warranty_end && typeof assetData.warranty_end === 'string') {
                assetData.warranty_end = admin.firestore.Timestamp.fromDate(new Date(assetData.warranty_end));
            }
            if (assetData.subscription_start && typeof assetData.subscription_start === 'string') {
                assetData.subscription_start = admin.firestore.Timestamp.fromDate(new Date(assetData.subscription_start));
            }
            if (assetData.subscription_end && typeof assetData.subscription_end === 'string') {
                assetData.subscription_end = admin.firestore.Timestamp.fromDate(new Date(assetData.subscription_end));
            }

            const docRef = await assetsCollection.add(assetData);
            res.status(201).json({ id: docRef.id, message: 'Asset created successfully' });
        } catch (error) {
            console.error('Error creating asset:', error);
            res.status(500).json({ error: 'Failed to create asset' });
        }
    });

    // @route   PUT /api/assets/:id
    // @desc    Update an asset
    // @access  Private (admin, super_admin, site_admin, or owner for basic updates)
    router.put('/:id', authenticateToken, async (req, res) => {
        try {
            const assetDoc = await assetsCollection.doc(req.params.id).get();
            
            if (!assetDoc.exists) {
                return res.status(404).json({ error: 'Asset not found' });
            }

            const asset = assetDoc.data();
            const hasAccess = await canAccessAsset(req.user, asset);
            
            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Users can only update certain fields (self-service requests)
            if (req.user.role === 'user') {
                const allowedFields = ['notes', 'reported_issues'];
                const updateData = {};
                allowedFields.forEach(field => {
                    if (req.body[field] !== undefined) {
                        updateData[field] = req.body[field];
                    }
                });
                updateData.updated_at = admin.firestore.FieldValue.serverTimestamp();
                await assetsCollection.doc(req.params.id).update(updateData);
            } else {
                // Admins can update all fields
                const updateData = {
                    ...req.body,
                    updated_at: admin.firestore.FieldValue.serverTimestamp(),
                };

                // Convert date strings to Firestore timestamps
                if (updateData.warranty_start && typeof updateData.warranty_start === 'string') {
                    updateData.warranty_start = admin.firestore.Timestamp.fromDate(new Date(updateData.warranty_start));
                }
                if (updateData.warranty_end && typeof updateData.warranty_end === 'string') {
                    updateData.warranty_end = admin.firestore.Timestamp.fromDate(new Date(updateData.warranty_end));
                }
                if (updateData.subscription_start && typeof updateData.subscription_start === 'string') {
                    updateData.subscription_start = admin.firestore.Timestamp.fromDate(new Date(updateData.subscription_start));
                }
                if (updateData.subscription_end && typeof updateData.subscription_end === 'string') {
                    updateData.subscription_end = admin.firestore.Timestamp.fromDate(new Date(updateData.subscription_end));
                }

                delete updateData.id; // Remove id from update data
                await assetsCollection.doc(req.params.id).update(updateData);
            }

            res.json({ message: 'Asset updated successfully' });
        } catch (error) {
            console.error('Error updating asset:', error);
            res.status(500).json({ error: 'Failed to update asset' });
        }
    });

    // @route   DELETE /api/assets/:id
    // @desc    Delete an asset
    // @access  Private (admin, super_admin, site_admin)
    router.delete('/:id', authenticateToken, checkRole(['admin', 'super_admin', 'site_admin']), async (req, res) => {
        try {
            const assetDoc = await assetsCollection.doc(req.params.id).get();
            
            if (!assetDoc.exists) {
                return res.status(404).json({ error: 'Asset not found' });
            }

            await assetsCollection.doc(req.params.id).delete();
            res.json({ message: 'Asset deleted successfully' });
        } catch (error) {
            console.error('Error deleting asset:', error);
            res.status(500).json({ error: 'Failed to delete asset' });
        }
    });

    // @route   POST /api/assets/bulk-action
    // @desc    Perform bulk actions on assets
    // @access  Private (admin, super_admin, site_admin)
    router.post('/bulk-action', authenticateToken, checkRole(['admin', 'super_admin', 'site_admin']), async (req, res) => {
        try {
            const { asset_ids, action, data } = req.body;

            if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
                return res.status(400).json({ error: 'Asset IDs array is required' });
            }

            if (!action) {
                return res.status(400).json({ error: 'Action is required' });
            }

            const batch = db.batch();
            const updateData = {
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
            };

            switch (action) {
                case 'assign':
                    if (data.owner_uid) {
                        updateData.owner_uid = data.owner_uid;
                    }
                    if (data.client_name) {
                        updateData.client_name = data.client_name;
                    }
                    break;
                case 'retire':
                    updateData.status = 'Retired';
                    break;
                case 'update_status':
                    if (data.status) {
                        updateData.status = data.status;
                    }
                    break;
                case 'update_warranty':
                    if (data.warranty_end) {
                        updateData.warranty_end = admin.firestore.Timestamp.fromDate(new Date(data.warranty_end));
                    }
                    break;
                default:
                    return res.status(400).json({ error: 'Invalid action' });
            }

            asset_ids.forEach(assetId => {
                const assetRef = assetsCollection.doc(assetId);
                batch.update(assetRef, updateData);
            });

            await batch.commit();
            res.json({ message: `Bulk action '${action}' completed successfully` });
        } catch (error) {
            console.error('Error performing bulk action:', error);
            res.status(500).json({ error: 'Failed to perform bulk action' });
        }
    });

    // @route   GET /api/assets/user/:uid
    // @desc    Get assets for a specific user
    // @access  Private
    router.get('/user/:uid', authenticateToken, async (req, res) => {
        try {
            // Check if user has permission
            if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.role !== 'site_admin' && req.user.uid !== req.params.uid) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const snapshot = await assetsCollection.where('owner_uid', '==', req.params.uid).get();
            const assets = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
                updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at,
                warranty_start: doc.data().warranty_start?.toDate?.()?.toISOString() || doc.data().warranty_start,
                warranty_end: doc.data().warranty_end?.toDate?.()?.toISOString() || doc.data().warranty_end,
                subscription_start: doc.data().subscription_start?.toDate?.()?.toISOString() || doc.data().subscription_start,
                subscription_end: doc.data().subscription_end?.toDate?.()?.toISOString() || doc.data().subscription_end,
            }));

            res.json(assets);
        } catch (error) {
            console.error('Error fetching user assets:', error);
            res.status(500).json({ error: 'Failed to fetch user assets' });
        }
    });

    // @route   POST /api/assets/upload-image
    // @desc    Upload an image for a hardware asset
    // @access  Private (admin, super_admin, site_admin)
    router.post('/upload-image', authenticateToken, checkRole(['admin', 'super_admin', 'site_admin']), async (req, res) => {
        if (!admin.storage()) {
            if (!res.headersSent) {
                return res.status(500).json({ error: "Firebase Storage not configured on the server." });
            }
            return;
        }

        const busboy = Busboy({ 
            headers: req.headers, 
            limits: { 
                fileSize: 5 * 1024 * 1024, // Max 5MB per image
                files: 1
            },
            timeout: 30000
        });
        const bucket = admin.storage().bucket();

        let uploadedImage = null;
        let responseSent = false;

        const sendResponse = (statusCode, data) => {
            if (!responseSent) {
                responseSent = true;
                return res.status(statusCode).json(data);
            }
        };

        busboy.on('file', (fieldname, file, filenameInfo) => {
            if (responseSent) {
                file.resume();
                return;
            }

            const { filename: originalFilename, mimetype } = filenameInfo;
            const fileExtension = path.extname(originalFilename).toLowerCase();
            
            const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

            const isMimeTypeAllowed = mimetype && allowedMimeTypes.includes(mimetype);
            const isExtensionAllowed = fileExtension && allowedExtensions.includes(fileExtension);

            if (!isMimeTypeAllowed && !isExtensionAllowed) {
                file.resume();
                return sendResponse(400, { error: `Invalid file type. Only JPG, PNG, and WEBP images are allowed.` });
            }

            const uniqueFilename = `${uuidv4()}${fileExtension}`;
            const filepath = path.join(os.tmpdir(), uniqueFilename);
            const writeStream = fs.createWriteStream(filepath);

            file.pipe(writeStream);

            writeStream.on('finish', () => {
                const destination = `assets/images/${Date.now()}_${uniqueFilename}`;
                
                bucket.upload(filepath, {
                    destination: destination,
                    metadata: {
                        contentType: mimetype,
                        metadata: {
                            firebaseStorageDownloadTokens: uuidv4(),
                            uploadedBy: req.user.email,
                            originalFileName: originalFilename
                        }
                    },
                    resumable: false,
                    validation: false,
                    gzip: true
                })
                .then(() => {
                    const fileRef = bucket.file(destination);
                    return fileRef.makePublic();
                })
                .then(() => {
                    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
                    uploadedImage = {
                        url: publicUrl,
                        originalFilename: originalFilename,
                        mimetype: mimetype
                    };
                    // Clean up temp file
                    setImmediate(() => fs.unlink(filepath, () => {}));
                })
                .catch(err => {
                    console.error("Error uploading image to Firebase Storage:", err);
                    setImmediate(() => fs.unlink(filepath, () => {}));
                    if (!responseSent) {
                        sendResponse(500, { error: "Failed to upload image: " + err.message });
                    }
                });
            });

            writeStream.on('error', (err) => {
                console.error("Error writing file to temp:", err);
                setImmediate(() => fs.unlink(filepath, () => {}));
                if (!responseSent) {
                    sendResponse(500, { error: "Failed to process image: " + err.message });
                }
            });
        });

        busboy.on('finish', async () => {
            if (uploadedImage) {
                sendResponse(200, { image: uploadedImage });
            } else if (!responseSent) {
                sendResponse(400, { error: "No image file provided" });
            }
        });

        busboy.on('error', (error) => {
            console.error('Busboy parsing error:', error);
            if (!responseSent) {
                sendResponse(400, { error: "Error parsing upload: " + error.message });
            }
        });

        req.pipe(busboy);
    });

    // @route   POST /api/assets/:id/repair-queue
    // @desc    Create a repair queue item for a hardware asset
    // @access  Private (admin, super_admin, site_admin)
    router.post('/:id/repair-queue', authenticateToken, checkRole(['admin', 'super_admin', 'site_admin']), async (req, res) => {
        try {
            const assetDoc = await assetsCollection.doc(req.params.id).get();
            
            if (!assetDoc.exists) {
                return res.status(404).json({ error: 'Asset not found' });
            }

            const asset = assetDoc.data();
            
            // Only hardware assets can be added to repair queue
            if (asset.asset_type !== 'hardware') {
                return res.status(400).json({ error: 'Only hardware assets can be added to repair queue' });
            }

            // Check access permission
            const hasAccess = await canAccessAsset(req.user, asset);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const { issue_description, priority = 'Medium', assigned_to_uid } = req.body;

            if (!issue_description) {
                return res.status(400).json({ error: 'Issue description is required' });
            }

            // Initialize repair_queue array if it doesn't exist
            const repairQueue = asset.repair_queue || [];
            
            // Create timestamp first (can't use serverTimestamp in arrays)
            const now = admin.firestore.Timestamp.now();
            
            const repairQueueItem = {
                id: `RQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                status: 'Queued',
                issue_description,
                priority,
                assigned_to_uid: assigned_to_uid || null,
                created_by_uid: req.user.uid,
                created_by_name: req.user.name || req.user.email,
                created_at: now,
                updated_at: now,
                started_at: null,
                completed_at: null,
                retest_date: null,
                retest_result: null,
                completion_notes: null,
            };

            repairQueue.push(repairQueueItem);

            // Update asset status to "Under Repair" if not already
            const updateData = {
                repair_queue: repairQueue,
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
            };

            if (asset.status !== 'Under Repair') {
                updateData.status = 'Under Repair';
            }

            await assetsCollection.doc(req.params.id).update(updateData);

            res.status(201).json({ 
                message: 'Asset added to repair queue successfully',
                repair_queue_item: repairQueueItem
            });
        } catch (error) {
            console.error('Error creating repair queue item:', error);
            res.status(500).json({ error: 'Failed to create repair queue item' });
        }
    });

    // @route   PUT /api/assets/:id/repair-queue/:queueId
    // @desc    Update repair queue item status
    // @access  Private (admin, super_admin, site_admin)
    router.put('/:id/repair-queue/:queueId', authenticateToken, checkRole(['admin', 'super_admin', 'site_admin']), async (req, res) => {
        try {
            const assetDoc = await assetsCollection.doc(req.params.id).get();
            
            if (!assetDoc.exists) {
                return res.status(404).json({ error: 'Asset not found' });
            }

            const asset = assetDoc.data();
            const hasAccess = await canAccessAsset(req.user, asset);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const { queueId } = req.params;
            const { status, retest_result, completion_notes, assigned_to_uid } = req.body;

            const repairQueue = asset.repair_queue || [];
            const queueItemIndex = repairQueue.findIndex(item => item.id === queueId);

            if (queueItemIndex === -1) {
                return res.status(404).json({ error: 'Repair queue item not found' });
            }

            const queueItem = repairQueue[queueItemIndex];
            const now = admin.firestore.Timestamp.now();
            const updateData = {};

            if (status) {
                updateData.status = status;
                
                // Set timestamps based on status (use Timestamp.now() instead of serverTimestamp for arrays)
                if (status === 'In Progress' && !queueItem.started_at) {
                    updateData.started_at = now;
                }
                if (status === 'Completed') {
                    updateData.completed_at = now;
                    updateData.completion_notes = completion_notes || null;
                }
                if (status === 'Retesting') {
                    updateData.retest_date = now;
                }
            }

            if (retest_result !== undefined) {
                updateData.retest_result = retest_result;
            }

            if (completion_notes !== undefined) {
                updateData.completion_notes = completion_notes;
            }

            if (assigned_to_uid !== undefined) {
                updateData.assigned_to_uid = assigned_to_uid;
            }

            updateData.updated_at = now;
            updateData.updated_by_uid = req.user.uid;
            updateData.updated_by_name = req.user.name || req.user.email;

            // Update the queue item
            repairQueue[queueItemIndex] = {
                ...queueItem,
                ...updateData,
            };

            // If all queue items are completed, update asset status
            const allCompleted = repairQueue.every(item => item.status === 'Completed');
            const hasInProgress = repairQueue.some(item => item.status === 'In Progress' || item.status === 'Retesting');

            const assetUpdateData = {
                repair_queue: repairQueue,
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
            };

            if (allCompleted && asset.status === 'Under Repair') {
                assetUpdateData.status = 'Active';
            } else if (hasInProgress && asset.status !== 'Under Repair') {
                assetUpdateData.status = 'Under Repair';
            }

            await assetsCollection.doc(req.params.id).update(assetUpdateData);

            res.json({ 
                message: 'Repair queue item updated successfully',
                repair_queue_item: repairQueue[queueItemIndex]
            });
        } catch (error) {
            console.error('Error updating repair queue item:', error);
            res.status(500).json({ error: 'Failed to update repair queue item' });
        }
    });

    // @route   GET /api/assets/:id/repair-queue
    // @desc    Get repair queue items for an asset
    // @access  Private
    router.get('/:id/repair-queue', authenticateToken, async (req, res) => {
        try {
            const assetDoc = await assetsCollection.doc(req.params.id).get();
            
            if (!assetDoc.exists) {
                return res.status(404).json({ error: 'Asset not found' });
            }

            const asset = assetDoc.data();
            const hasAccess = await canAccessAsset(req.user, asset);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const repairQueue = (asset.repair_queue || []).map(item => ({
                ...item,
                created_at: item.created_at?.toDate?.()?.toISOString() || item.created_at,
                updated_at: item.updated_at?.toDate?.()?.toISOString() || item.updated_at,
                started_at: item.started_at?.toDate?.()?.toISOString() || item.started_at,
                completed_at: item.completed_at?.toDate?.()?.toISOString() || item.completed_at,
                retest_date: item.retest_date?.toDate?.()?.toISOString() || item.retest_date,
            }));

            res.json(repairQueue);
        } catch (error) {
            console.error('Error fetching repair queue:', error);
            res.status(500).json({ error: 'Failed to fetch repair queue' });
        }
    });

    return router;
};

