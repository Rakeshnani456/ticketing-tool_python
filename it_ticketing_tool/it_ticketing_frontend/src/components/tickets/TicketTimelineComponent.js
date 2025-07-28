// src/components/tickets/TicketTimelineComponent.js

import React from 'react';
import {
    Calendar,
    User,
    MessageSquare,
    Paperclip,
    CheckCircle,
    Tag,
    Clock,
    TrendingUp,
    ArrowDown,
} from 'lucide-react';

// Function to get color for icons based on event type
const getIconColorClass = (eventType) => {
    switch (eventType) {
        case 'created': return 'text-blue-600';
        case 'priority_init': return 'text-purple-600';
        case 'status_change': return 'text-yellow-600';
        case 'status_init': return 'text-yellow-600';
        case 'assigned_change': return 'text-indigo-600';
        case 'assigned_init': return 'text-indigo-600';
        case 'comment': return 'text-green-600';
        case 'attachment_added': return 'text-teal-600';
        case 'resolved': return 'text-green-800';
        default: return 'text-gray-600';
    }
};

const iconMap = {
    Calendar,
    User,
    MessageSquare,
    Paperclip,
    CheckCircle,
    Tag,
    Clock,
    TrendingUp,
};

const TicketTimelineComponent = ({ timelineEvents }) => {
    // Sort events to show latest on top, and filter out invalid dates if any somehow slipped through
    const sortedEvents = [...timelineEvents]
        .filter(event => {
            const date = new Date(event.timestamp);
            return !isNaN(date.getTime());
        })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort descending for latest on top

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full"> {/* Reduced padding slightly */}
            <h3 className="text-base font-medium text-gray-900 flex items-center mb-4">
                <Clock className="w-4 h-4 mr-2" />
                Ticket Timeline
            </h3>
            <div className="relative pl-6"> {/* Left padding for the line, adjusted for spacing */}
                {/* Vertical line */}
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                {sortedEvents.length > 0 ? (
                    sortedEvents.map((event, index) => {
                        const EventIcon = iconMap[event.icon?.displayName || event.icon?.name] || Clock;
                        return (
                            <div key={index} className="mb-4 relative last:mb-0">
                                {/* Circle indicator */}
                                <div className="absolute left-0 top-0 mt-1 flex items-center justify-center w-6 h-6 bg-white border border-gray-300 rounded-full -translate-x-1/2 z-10">
                                    <EventIcon size={14} className={getIconColorClass(event.type)} />
                                </div>
                                <div className="ml-4 pl-2 pb-2 break-words"> {/* Content shifted right, with padding-bottom for spacing */}
                                    <p className="text-sm font-semibold text-gray-800">
                                        {event.label}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        {new Date(event.timestamp).toLocaleDateString()}
                                        <br/> {/* Line break for time to keep it compact */}
                                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    {event.detail && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            By: {event.detail.split('@')[0]}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-gray-500 text-sm">No timeline events to display.</p>
                )}
            </div>
        </div>
    );
};

export default TicketTimelineComponent;