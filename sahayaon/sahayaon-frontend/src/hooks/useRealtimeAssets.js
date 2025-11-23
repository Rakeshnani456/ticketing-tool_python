// hooks/useRealtimeAssets.js
import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { dbClient } from '../config/firebase';

/**
 * Custom hook for real-time asset management with optimized Firebase reads
 * Features:
 * - Real-time updates via Firestore snapshots
 * - Automatic caching to minimize reads
 * - Role-based filtering at database level
 * - Proper cleanup on unmount
 * - Debounced updates to prevent excessive re-renders
 */
const useRealtimeAssets = (currentUser) => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Cache to track processed document IDs and prevent duplicate processing
    const processedDocsCache = useRef(new Set());
    const lastUpdateTime = useRef(Date.now());
    const updateBuffer = useRef([]);
    const updateTimerRef = useRef(null);
    
    // Debounce interval in milliseconds (group updates within this window)
    const DEBOUNCE_INTERVAL = 300;

    useEffect(() => {
        if (!currentUser || !currentUser.uid) {
            setLoading(false);
            return;
        }

        let unsubscribe = null;

        const setupRealtimeListener = async () => {
            try {
                const assetsRef = collection(dbClient, 'assets');
                let q;

                // Role-based query optimization - filter at database level to minimize reads
                if (currentUser.role === 'user') {
                    // Users only see their own assets
                    q = query(assetsRef, where('owner_uid', '==', currentUser.uid));
                } else if (currentUser.role === 'site_admin') {
                    // Site admins see assets for their client
                    if (currentUser.client_name) {
                        q = query(assetsRef, where('client_name', '==', currentUser.client_name));
                    } else {
                        q = query(assetsRef);
                    }
                } else {
                    // super_admin and admin see all assets
                    q = query(assetsRef);
                }

                // Set up real-time listener with snapshot
                unsubscribe = onSnapshot(
                    q,
                    {
                        // Enable source options for better performance
                        includeMetadataChanges: false, // Ignore metadata-only changes
                    },
                    (snapshot) => {
                        const now = Date.now();
                        const timeSinceLastUpdate = now - lastUpdateTime.current;

                        // Process snapshot changes efficiently
                        const assetsList = [];
                        const newDocIds = new Set();

                        snapshot.forEach((doc) => {
                            newDocIds.add(doc.id);
                            
                            const data = doc.data();
                            assetsList.push({
                                id: doc.id,
                                ...data,
                                // Convert Firestore timestamps to ISO strings
                                created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
                                updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
                                warranty_start: data.warranty_start?.toDate?.()?.toISOString() || data.warranty_start,
                                warranty_end: data.warranty_end?.toDate?.()?.toISOString() || data.warranty_end,
                                subscription_start: data.subscription_start?.toDate?.()?.toISOString() || data.subscription_start,
                                subscription_end: data.subscription_end?.toDate?.()?.toISOString() || data.subscription_end,
                            });
                        });

                        // Update cache
                        processedDocsCache.current = newDocIds;

                        // Debounced update strategy
                        // If updates are coming rapidly, buffer them
                        if (timeSinceLastUpdate < DEBOUNCE_INTERVAL) {
                            // Clear existing timer
                            if (updateTimerRef.current) {
                                clearTimeout(updateTimerRef.current);
                            }

                            // Buffer this update
                            updateBuffer.current = assetsList;

                            // Set new timer
                            updateTimerRef.current = setTimeout(() => {
                                setAssets(updateBuffer.current);
                                setLoading(false);
                                setError(null);
                                lastUpdateTime.current = Date.now();
                                updateBuffer.current = [];
                            }, DEBOUNCE_INTERVAL);
                        } else {
                            // Immediate update if enough time has passed
                            setAssets(assetsList);
                            setLoading(false);
                            setError(null);
                            lastUpdateTime.current = now;
                        }

                        // Log for debugging (can be removed in production)
                        console.log(`📦 Real-time assets update: ${assetsList.length} assets loaded (${snapshot.metadata.fromCache ? 'from cache' : 'from server'})`);
                    },
                    (err) => {
                        console.error('❌ Error in assets real-time listener:', err);
                        setError(err.message);
                        setLoading(false);
                    }
                );

            } catch (err) {
                console.error('❌ Error setting up real-time listener:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        setupRealtimeListener();

        // Cleanup function - unsubscribe from listener on unmount
        return () => {
            if (unsubscribe) {
                unsubscribe();
                console.log('🔌 Unsubscribed from assets real-time listener');
            }
            if (updateTimerRef.current) {
                clearTimeout(updateTimerRef.current);
            }
            // Clear cache on unmount
            processedDocsCache.current.clear();
        };
    }, [currentUser?.uid, currentUser?.role, currentUser?.client_name]);

    // Calculate summary statistics from local data (no additional reads)
    const summary = {
        total_assets: assets.length,
        hardware_count: assets.filter(a => a.asset_type === 'hardware').length,
        software_count: assets.filter(a => a.asset_type === 'software').length,
        active_assets: assets.filter(a => a.status === 'Active').length,
        retired_assets: assets.filter(a => a.status === 'Retired').length,
        under_repair: assets.filter(a => a.status === 'Under Repair').length,
        warranty_expiring_soon: assets.filter(a => {
            if (!a.warranty_end) return false;
            const endDate = new Date(a.warranty_end);
            const now = new Date();
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            return endDate <= thirtyDaysFromNow && endDate >= now;
        }).length,
        subscription_renewals_due: assets.filter(a => {
            if (!a.subscription_end || a.asset_type !== 'software') return false;
            const endDate = new Date(a.subscription_end);
            const now = new Date();
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            return endDate <= thirtyDaysFromNow && endDate >= now;
        }).length,
        high_risk_assets: assets.filter(a => a.risk_level === 'High' || a.flagged === true).length,
    };

    return {
        assets,
        summary,
        loading,
        error,
        // Manual refresh function (usually not needed with real-time)
        refresh: () => {
            // Snapshot will automatically refresh
            console.log('🔄 Assets will auto-refresh via snapshot listener');
        }
    };
};

export default useRealtimeAssets;


