// src/components/tickets/MyQueueComponent.js

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { dbClient } from '../../config/firebase';
import ModernTicketGrid from '../common/ModernTicketGrid';

/**
 * Component to display tickets assigned to the current user (My Queue)
 * Only shows tickets with status: Open, In Progress, or On Hold
 * No filter buttons - simple list of assigned tickets
 * 
 * @param {object} props - Component props
 * @param {object} props.user - The current authenticated user object
 * @param {function} props.navigateTo - Function to navigate to different pages
 * @param {function} props.showFlashMessage - Function to display temporary messages
 * @returns {JSX.Element} The list of assigned tickets or a loading/error message
 */
const MyQueueComponent = ({ user, navigateTo, showFlashMessage }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const firebaseUser = user?.firebaseUser;
        if (!firebaseUser || !dbClient) {
            setLoading(false);
            return;
        }

        setError(null);
        const db = dbClient;

        // Query tickets assigned to the current user
        // Note: We filter by status and sort client-side to avoid composite index requirements
        // Firestore requires a composite index for where('status', 'in', [...]) + orderBy on a different field
        const ticketsQuery = query(
            collection(db, 'tickets'),
            where('assigned_to_email', '==', user.email)
        );

        // Set up the real-time listener
        const unsubscribe = onSnapshot(
            ticketsQuery,
            (snapshot) => {
                const ticketsList = [];
                snapshot.forEach((doc) => {
                    const ticketData = doc.data();
                    // Format Firestore timestamps
                    const formattedTicket = {
                        id: doc.id,
                        ...ticketData,
                        created_at: ticketData.created_at?.toDate ? ticketData.created_at.toDate().toISOString() : ticketData.created_at,
                        updated_at: ticketData.updated_at?.toDate ? ticketData.updated_at.toDate().toISOString() : ticketData.updated_at,
                        resolved_at: ticketData.resolved_at?.toDate ? ticketData.resolved_at.toDate().toISOString() : ticketData.resolved_at,
                    };
                    ticketsList.push(formattedTicket);
                });
                
                // Filter by status: Open, In Progress, or Hold (client-side)
                const allowedStatuses = ['Open', 'In Progress', 'Hold'];
                let filteredTickets = ticketsList.filter(ticket => 
                    allowedStatuses.includes(ticket.status)
                );
                
                // Sort by updated_at descending (most recently updated first)
                filteredTickets.sort((a, b) => {
                    const aDate = new Date(a.updated_at || a.created_at || 0);
                    const bDate = new Date(b.updated_at || b.created_at || 0);
                    return bDate - aDate; // Descending order
                });
                
                setTickets(filteredTickets);
                setLoading(false);
            },
            (err) => {
                console.error('Error fetching assigned tickets:', err);
                setError(`Failed to load tickets: ${err.message}`);
                showFlashMessage(`Failed to load your queue: ${err.message}`, 'error');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user, showFlashMessage]);

    const handlePeekTicket = (ticket) => {
        // Optional: Implement peek functionality if needed
        navigateTo('/tickets', ticket.id);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <Loader2 className="animate-spin h-8 w-8 text-blue-500 mb-3" />
                <p className="text-gray-600 text-sm">Loading your queue...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-red-300 rounded-lg bg-red-50">
                <p className="text-red-600 text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="p-4 bg-white flex-1 overflow-auto w-full max-w-full overflow-x-hidden">
            {/* Header */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">My Queue</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
                <p className="text-sm text-gray-500">
                    Tickets assigned to you (Open, In Progress, or On Hold)
                </p>
            </div>

            {/* Tickets Grid */}
            {tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <p className="text-gray-600 text-sm text-center">
                        No tickets assigned to you.
                    </p>
                </div>
            ) : (
                <ModernTicketGrid
                    tickets={tickets}
                    onTicketClick={(ticket) => navigateTo('/tickets', ticket.id)}
                    onStatusChange={null}
                    onAssignmentChange={null}
                    onPeek={handlePeekTicket}
                    user={user}
                    loading={loading}
                    showCheckboxes={false}
                    selectedTickets={[]}
                    startIndex={0}
                />
            )}
        </div>
    );
};

export default MyQueueComponent;

