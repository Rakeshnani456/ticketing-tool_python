// src/components/tickets/TicketDetailHeader.js

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Timeline from './Timeline';

const TicketDetailHeader = ({ 
    ticket, 
    isSupportUser, 
    navigateTo, 
    timelineEvents
}) => {
    return (
        <div className="w-full min-w-0 max-w-full overflow-x-hidden">
            {/* Header */}
            <div className="w-full mx-auto min-w-0 max-w-full mb-1 sm:mb-2 overflow-x-hidden">
                <div className="bg-white py-1 sm:py-1.5 px-1 sm:px-1.5 md:px-2 flex flex-col sm:flex-row items-start sm:items-center w-full min-w-0 max-w-full justify-between gap-1 sm:gap-1.5 overflow-x-hidden">
                    <div className="flex items-center w-full min-w-0 max-w-full overflow-x-hidden">
                        {/* Back button and ticket ID */}
                        <div className="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0 mr-1 sm:mr-1.5">
                            <button
                                onClick={() => navigateTo(isSupportUser ? 'allTickets' : 'myTickets')}
                                className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 scale-100 hover:scale-105 rounded-md"
                                title="Back"
                            >
                                <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                            </button>
                            <div className="flex flex-col min-w-0">
                                <h1 className="text-xs sm:text-sm font-bold whitespace-nowrap truncate">{ticket.display_id}</h1>
                            </div>
                        </div>
                        {/* Subject line */}
                        <div className="flex items-center min-w-0 bg-gray-50 rounded-md px-1.5 sm:px-2 py-1.5 border border-gray-200 flex-1 max-w-full overflow-hidden">
                            <span className="text-xs sm:text-sm text-red-500 font-bold mr-1.5 sm:mr-2 shrink-0">Subject:</span>
                            <span className="text-xs sm:text-sm truncate font-medium min-w-0 flex-1">
                                {ticket.short_description || <span className="text-gray-400 italic">No subject provided</span>}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Timeline Section below header - reduced width */}
            <div className="w-4/5 mx-auto min-w-0 max-w-full overflow-x-hidden">
                <Timeline events={timelineEvents} />
            </div>
        </div>
    );
};

export default TicketDetailHeader; 