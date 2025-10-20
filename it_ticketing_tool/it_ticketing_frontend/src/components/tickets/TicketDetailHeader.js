// src/components/tickets/TicketDetailHeader.js

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Timeline from './Timeline';

const TicketDetailHeader = ({ 
    ticket, 
    isSupportUser, 
    navigateTo, 
    timelineEvents
}) => {
    const navigate = useNavigate();

    const handleBackClick = () => {
        // Check if there's history to go back to
        if (window.history.length > 1) {
            navigate(-1); // Go back to previous page
        } else {
            // Fallback to default navigation if no history
            navigateTo(isSupportUser ? 'allTickets' : 'myTickets');
        }
    };
    return (
        <div className="w-full min-w-0 max-w-full overflow-x-hidden">
            {/* Header */}
            <div className="w-full mx-auto min-w-0 max-w-full mb-1 sm:mb-2 overflow-x-hidden">
                <div className="bg-white py-1 sm:py-1.5 px-1 sm:px-1.5 md:px-2 flex flex-col sm:flex-row items-start sm:items-center w-full min-w-0 max-w-full justify-between gap-1 sm:gap-1.5 overflow-x-hidden">
                    <div className="flex items-center w-full min-w-0 max-w-full overflow-x-hidden">
                        {/* Back button */}
                        <div className="flex items-center flex-shrink-0 mr-1 sm:mr-1.5">
                            <button
                                onClick={handleBackClick}
                                className="flex items-center justify-center 
               w-12 h-8 sm:h-8 
               border border-orange-400 hover:bg-orange-600
               text-black text-sm hover:text-white
               rounded-md shadow-md 
               transition-colors duration-150 
               "
                                title="Back"
                            >
                                <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5 hover:text-white" />
                            </button>
                        </div>
                        {/* Subject line */}
                        <div className="flex items-center min-w-0 bg-gray-50 rounded-md px-1.5 sm:px-2 py-1.5 border border-gray-200 flex-1 max-w-full overflow-hidden">

                            <span className="text-sm sm:text-base lg:text-lg truncate font-medium min-w-0 flex-1 text-gray-800">
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