// hooks/useRealtimeUsers.js
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { dbClient } from '../config/firebase';

/**
 * Custom hook for real-time user management with optimized Firebase reads
 * Features:
 * - Real-time updates via Firestore snapshots
 * - Client-specific filtering
 * - Automatic caching to minimize reads
 * - Proper cleanup on unmount
 */
const useRealtimeUsers = (clientName) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!clientName) {
            setLoading(false);
            setUsers([]);
            return;
        }

        let unsubscribe = null;

        const setupRealtimeListener = async () => {
            try {
                const usersRef = collection(dbClient, 'users');
                
                // Query users by client_name
                const q = query(usersRef, where('client_name', '==', clientName));

                // Set up real-time listener
                unsubscribe = onSnapshot(
                    q,
                    {
                        includeMetadataChanges: false, // Ignore metadata-only changes
                    },
                    (snapshot) => {
                        const usersList = [];

                        snapshot.forEach((doc) => {
                            const data = doc.data();
                            usersList.push({
                                uid: doc.id,
                                ...data,
                            });
                        });

                        setUsers(usersList);
                        setLoading(false);
                        setError(null);

                        console.log(`👥 Real-time users update: ${usersList.length} users loaded (${snapshot.metadata.fromCache ? 'from cache' : 'from server'})`);
                    },
                    (err) => {
                        console.error('❌ Error in users real-time listener:', err);
                        setError(err.message);
                        setLoading(false);
                    }
                );

            } catch (err) {
                console.error('❌ Error setting up users real-time listener:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        setupRealtimeListener();

        // Cleanup function
        return () => {
            if (unsubscribe) {
                unsubscribe();
                console.log('🔌 Unsubscribed from users real-time listener');
            }
        };
    }, [clientName]);

    return {
        users,
        loading,
        error,
    };
};

export default useRealtimeUsers;


