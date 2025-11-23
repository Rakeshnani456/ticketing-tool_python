// routes/vendorRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (db, admin, vendorsCollection, usersCollection, clientsCollection, authenticateToken, checkRole) => {

    // Helper function to check if user can access vendor
    const canAccessVendor = async (user, vendor) => {
        if (user.role === 'super_admin' || user.role === 'admin') {
            return true;
        }
        if (user.role === 'site_admin' && vendor.client_name && user.client_name === vendor.client_name) {
            return true;
        }
        return false;
    };

    // @route   GET /api/vendors
    // @desc    Get all vendors (filtered by role)
    // @access  Private
    router.get('/', authenticateToken, async (req, res) => {
        try {
            let query = vendorsCollection;

            // Role-based filtering
            if (req.user.role === 'site_admin') {
                // Site admins see vendors for their client
                if (req.user.client_name) {
                    // If query param client_name is provided, validate it matches user's client_name
                    if (req.query.client_name && req.query.client_name !== req.user.client_name) {
                        return res.status(403).json({ error: 'Access denied: Cannot access vendors for other clients' });
                    }
                    query = query.where('client_name', '==', req.user.client_name);
                } else {
                    return res.status(403).json({ error: 'Site admin must have a client_name assigned' });
                }
            } else if (req.user.role === 'user') {
                // Regular users cannot access vendors
                return res.status(403).json({ error: 'Access denied' });
            } else {
                // super_admin and admin can see all vendors, but can filter by client_name
                if (req.query.client_name) {
                    query = query.where('client_name', '==', req.query.client_name);
                }
            }

            const snapshot = await query.get();
            const vendors = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
                updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at,
            }));

            res.json(vendors);
        } catch (error) {
            console.error('Error fetching vendors:', error);
            res.status(500).json({ error: 'Failed to fetch vendors: ' + error.message });
        }
    });

    // @route   GET /api/vendors/:id
    // @desc    Get a specific vendor
    // @access  Private
    router.get('/:id', authenticateToken, async (req, res) => {
        try {
            const vendorDoc = await vendorsCollection.doc(req.params.id).get();
            
            if (!vendorDoc.exists) {
                return res.status(404).json({ error: 'Vendor not found' });
            }

            const vendor = {
                id: vendorDoc.id,
                ...vendorDoc.data(),
                created_at: vendorDoc.data().created_at?.toDate?.()?.toISOString() || vendorDoc.data().created_at,
                updated_at: vendorDoc.data().updated_at?.toDate?.()?.toISOString() || vendorDoc.data().updated_at,
            };

            // Check access permission
            const hasAccess = await canAccessVendor(req.user, vendor);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied' });
            }

            res.json(vendor);
        } catch (error) {
            console.error('Error fetching vendor:', error);
            res.status(500).json({ error: 'Failed to fetch vendor' });
        }
    });

    // @route   POST /api/vendors
    // @desc    Create a new vendor
    // @access  Private (admin, super_admin, site_admin)
    router.post('/', authenticateToken, checkRole(['admin', 'super_admin', 'site_admin']), async (req, res) => {
        try {
            const { vendor_name, description, contact_persons, address, client_name } = req.body;

            // Validate required fields
            if (!vendor_name) {
                return res.status(400).json({ error: 'Vendor name is required' });
            }

            if (!client_name) {
                return res.status(400).json({ error: 'Client name is required' });
            }

            // Site admins can only create vendors for their own client
            if (req.user.role === 'site_admin' && client_name !== req.user.client_name) {
                return res.status(403).json({ error: 'Site admins can only create vendors for their own client' });
            }

            // Validate contact_persons array
            if (contact_persons && !Array.isArray(contact_persons)) {
                return res.status(400).json({ error: 'Contact persons must be an array' });
            }

            // Validate each contact person
            if (contact_persons && contact_persons.length > 0) {
                for (const person of contact_persons) {
                    if (!person.name) {
                        return res.status(400).json({ error: 'Each contact person must have a name' });
                    }
                    // At least one of email or number should be provided
                    if (!person.email && !person.number) {
                        return res.status(400).json({ error: 'Each contact person must have at least an email or phone number' });
                    }
                }
            }

            const vendorData = {
                vendor_name,
                description: description || '',
                contact_persons: contact_persons || [],
                address: address || '',
                client_name,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                created_by_uid: req.user.uid,
            };

            const docRef = await vendorsCollection.add(vendorData);
            res.status(201).json({ 
                id: docRef.id, 
                message: 'Vendor created successfully',
                vendor: {
                    id: docRef.id,
                    ...vendorData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error creating vendor:', error);
            res.status(500).json({ error: 'Failed to create vendor: ' + error.message });
        }
    });

    // @route   PUT /api/vendors/:id
    // @desc    Update a vendor
    // @access  Private (admin, super_admin, site_admin)
    router.put('/:id', authenticateToken, checkRole(['admin', 'super_admin', 'site_admin']), async (req, res) => {
        try {
            const vendorDoc = await vendorsCollection.doc(req.params.id).get();
            
            if (!vendorDoc.exists) {
                return res.status(404).json({ error: 'Vendor not found' });
            }

            const vendor = vendorDoc.data();
            const hasAccess = await canAccessVendor(req.user, vendor);
            
            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const { vendor_name, description, contact_persons, address, client_name } = req.body;

            // Site admins cannot change the client_name
            if (req.user.role === 'site_admin' && client_name && client_name !== vendor.client_name) {
                return res.status(403).json({ error: 'Site admins cannot change the client assignment of vendors' });
            }

            // Validate contact_persons array if provided
            if (contact_persons !== undefined) {
                if (!Array.isArray(contact_persons)) {
                    return res.status(400).json({ error: 'Contact persons must be an array' });
                }
                
                // Validate each contact person
                for (const person of contact_persons) {
                    if (!person.name) {
                        return res.status(400).json({ error: 'Each contact person must have a name' });
                    }
                    // At least one of email or number should be provided
                    if (!person.email && !person.number) {
                        return res.status(400).json({ error: 'Each contact person must have at least an email or phone number' });
                    }
                }
            }

            const updateData = {
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
            };

            if (vendor_name !== undefined) updateData.vendor_name = vendor_name;
            if (description !== undefined) updateData.description = description;
            if (contact_persons !== undefined) updateData.contact_persons = contact_persons;
            if (address !== undefined) updateData.address = address;
            if (client_name !== undefined && req.user.role !== 'site_admin') {
                updateData.client_name = client_name;
            }

            await vendorsCollection.doc(req.params.id).update(updateData);

            res.json({ 
                message: 'Vendor updated successfully',
                vendor: {
                    id: req.params.id,
                    ...vendor,
                    ...updateData,
                    updated_at: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error updating vendor:', error);
            res.status(500).json({ error: 'Failed to update vendor: ' + error.message });
        }
    });

    // @route   DELETE /api/vendors/:id
    // @desc    Delete a vendor
    // @access  Private (admin, super_admin, site_admin)
    router.delete('/:id', authenticateToken, checkRole(['admin', 'super_admin', 'site_admin']), async (req, res) => {
        try {
            const vendorDoc = await vendorsCollection.doc(req.params.id).get();
            
            if (!vendorDoc.exists) {
                return res.status(404).json({ error: 'Vendor not found' });
            }

            const vendor = vendorDoc.data();
            const hasAccess = await canAccessVendor(req.user, vendor);
            
            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied' });
            }

            await vendorsCollection.doc(req.params.id).delete();
            res.json({ message: 'Vendor deleted successfully' });
        } catch (error) {
            console.error('Error deleting vendor:', error);
            res.status(500).json({ error: 'Failed to delete vendor: ' + error.message });
        }
    });

    // @route   GET /api/vendors/client/:clientName
    // @desc    Get all vendors for a specific client
    // @access  Private
    router.get('/client/:clientName', authenticateToken, async (req, res) => {
        try {
            const clientName = decodeURIComponent(req.params.clientName);

            // Check if user has permission to view vendors for this client
            if (req.user.role === 'site_admin' && req.user.client_name !== clientName) {
                return res.status(403).json({ error: 'Access denied' });
            }

            if (req.user.role === 'user') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const snapshot = await vendorsCollection.where('client_name', '==', clientName).get();
            const vendors = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
                updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || doc.data().updated_at,
            }));

            res.json(vendors);
        } catch (error) {
            console.error('Error fetching client vendors:', error);
            res.status(500).json({ error: 'Failed to fetch client vendors: ' + error.message });
        }
    });

    return router;
};

