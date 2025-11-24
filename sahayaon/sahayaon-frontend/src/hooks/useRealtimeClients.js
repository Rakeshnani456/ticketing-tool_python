// hooks/useRealtimeClients.js
import { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { dbClient } from '../config/firebase';
import SmartCacheManager from '../utils/smartCacheManager';

/**
 * Custom hook for real-time client management with caching
 * Features:
 * - Real-time updates via Firestore snapshots
 * - Automatic caching to minimize reads
 * - Proper cleanup on unmount
 * - Debounced updates to prevent excessive re-renders
 */
const useRealtimeClients = (currentUser) => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const lastUpdateTime = useRef(Date.now());
    const updateBuffer = useRef([]);
    const updateTimerRef = useRef(null);
    const unsubscribeRef = useRef(null);
    
    // Debounce interval in milliseconds
    const DEBOUNCE_INTERVAL = 300;
    const CACHE_KEY = 'clients_data';
    const CACHE_TYPE = 'CLIENTS';

    useEffect(() => {
        if (!currentUser || !currentUser.uid) {
            setLoading(false);
            return;
        }

        // Check cache first
        const cached = SmartCacheManager.getCachedData(CACHE_KEY, CACHE_TYPE, currentUser.uid);
        if (cached && cached.data) {
            setClients(cached.data);
            setLoading(false);
            console.log(`📦 Using cached clients data (age: ${Math.round(cached.age / 1000)}s)`);
        }

        const setupRealtimeListener = async () => {
            try {
                const clientsRef = collection(dbClient, 'clients');
                const q = query(clientsRef);

                // Set up real-time listener
                unsubscribeRef.current = onSnapshot(
                    q,
                    {
                        includeMetadataChanges: false, // Ignore metadata-only changes
                    },
                    (snapshot) => {
                        const now = Date.now();
                        const timeSinceLastUpdate = now - lastUpdateTime.current;

                        const clientsList = [];
                        snapshot.forEach((doc) => {
                            const data = doc.data();
                            clientsList.push({
                                id: doc.id,
                                client_id: doc.id,
                                ...data,
                            });
                        });

                        // Cache the data
                        SmartCacheManager.setCachedData(CACHE_KEY, clientsList, CACHE_TYPE, currentUser.uid);

                        // Debounced update strategy
                        if (timeSinceLastUpdate < DEBOUNCE_INTERVAL) {
                            if (updateTimerRef.current) {
                                clearTimeout(updateTimerRef.current);
                            }
                            updateBuffer.current = clientsList;
                            updateTimerRef.current = setTimeout(() => {
                                setClients(updateBuffer.current);
                                setLoading(false);
                                setError(null);
                                lastUpdateTime.current = Date.now();
                                updateBuffer.current = [];
                            }, DEBOUNCE_INTERVAL);
                        } else {
                            setClients(clientsList);
                            setLoading(false);
                            setError(null);
                            lastUpdateTime.current = now;
                        }

                        console.log(`🏢 Real-time clients update: ${clientsList.length} clients loaded (${snapshot.metadata.fromCache ? 'from cache' : 'from server'})`);
                    },
                    (err) => {
                        console.error('❌ Error in clients real-time listener:', err);
                        setError(err.message);
                        setLoading(false);
                    }
                );

            } catch (err) {
                console.error('❌ Error setting up clients real-time listener:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        setupRealtimeListener();

        // Cleanup function
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                console.log('🔌 Unsubscribed from clients real-time listener');
            }
            if (updateTimerRef.current) {
                clearTimeout(updateTimerRef.current);
            }
        };
    }, [currentUser?.uid]);

    return {
        clients,
        loading,
        error,
        refresh: () => {
            // Invalidate cache and let snapshot refresh
            SmartCacheManager.invalidateCache(CACHE_KEY, currentUser?.uid);
            console.log('🔄 Clients cache invalidated, will refresh via snapshot');
        }
    };
};

export default useRealtimeClients;


