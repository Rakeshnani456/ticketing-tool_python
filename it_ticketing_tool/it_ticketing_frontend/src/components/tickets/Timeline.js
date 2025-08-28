import React, { useRef, useState, useEffect } from 'react';
import { Calendar, Tag, User, MessageSquare, Paperclip, CheckCircle, ArrowRight, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Clock } from 'lucide-react';

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

const Timeline = ({ events = [] }) => {
    const [expanded, setExpanded] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const scrollRef = useRef(null);
    const timelineBarRef = useRef(null);
    const [isAnimating, setIsAnimating] = useState(false);

    // On mount or collapse, scroll to the far right (latest activity)
    useEffect(() => {
        if (expanded && scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
    }, [events, expanded]);

    // Enhanced scroll detection for both directions
    useEffect(() => {
        const checkScroll = () => {
            if (scrollRef.current) {
                const { scrollLeft, clientWidth, scrollWidth } = scrollRef.current;
                setCanScrollLeft(scrollLeft > 5); // Added buffer to prevent flickering
                setCanScrollRight(
                    scrollLeft + clientWidth < scrollWidth - 5
                );
            }
        };
        
        const resizeObserver = new ResizeObserver(checkScroll);
        if (scrollRef.current) {
            scrollRef.current.addEventListener('scroll', checkScroll);
            resizeObserver.observe(scrollRef.current);
        }
        
        return () => {
            if (scrollRef.current) {
                scrollRef.current.removeEventListener('scroll', checkScroll);
                resizeObserver.unobserve(scrollRef.current);
            }
        };
    }, [events, expanded]);

    const handleScrollLeft = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
        }
    };
    
    const handleScrollRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
        }
    };

    const handleToggle = () => {
        setIsAnimating(true);
        setExpanded((prev) => !prev);
        setTimeout(() => setIsAnimating(false), 300); // Match the duration of the animation
    };

    const getTooltipStyle = (index) => {
        if (!timelineBarRef.current) return { display: 'none' };
        const eventEls = timelineBarRef.current.querySelectorAll('.timeline-event');
        if (!eventEls[index]) return { display: 'none' };
        
        const eventRect = eventEls[index].getBoundingClientRect();
        const containerRect = timelineBarRef.current.getBoundingClientRect();
        const left = Math.min(
            Math.max(eventRect.left + eventRect.width / 2, containerRect.left + 100),
            containerRect.right - 100
        );
        
        return {
            left: left,
            top: eventRect.top - 8,
            transform: 'translateX(-50%) translateY(-100%)',
            position: 'fixed',
            zIndex: 9999,
            pointerEvents: 'none',
            maxWidth: 'min(220px, calc(100vw - 32px))'
        };
    };

    if (!events.length) return null;
    
    return (
        <div className="w-full min-w-0">
            <div
                ref={timelineBarRef}
                className={`bg-white border-t border-b border-gray-200 w-full relative overflow-hidden ${
                    isAnimating ? 'transition-[height,padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]' : ''
                } ${
                    expanded ? 'h-[180px] py-2' : 'h-[56px]'
                }`}
            >
                {/* Left Arrow + Fade */}
                {canScrollLeft && (
                    <div className="absolute top-0 left-0 h-full z-20 flex items-center">
                        <div className="pointer-events-none w-12 h-full" style={{background: 'linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 60%, rgba(255,255,255,0))'}} />
                        <button
                            className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 bg-white hover:bg-blue-50 rounded-full z-30 shadow-sm border border-gray-200 transition"
                            onClick={handleScrollLeft}
                            aria-label="Scroll timeline left"
                        >
                            <ChevronLeft className="w-4 h-4 text-blue-600" />
                        </button>
                    </div>
                )}
                
                {/* Right Arrow + Fade */}
                {canScrollRight && (
                    <div className="absolute top-0 right-0 h-full z-20 flex items-center">
                        <div className="pointer-events-none w-12 h-full" style={{background: 'linear-gradient(to left, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 60%, rgba(255,255,255,0))'}} />
                        <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 bg-white hover:bg-blue-50 rounded-full z-30 shadow-sm border border-gray-200 transition"
                            onClick={handleScrollRight}
                            aria-label="Scroll timeline right"
                        >
                            <ChevronRight className="w-4 h-4 text-blue-600" />
                        </button>
                    </div>
                )}
                
                {/* Tooltip */}
                {!expanded && hoveredIndex !== null && (
                    <div style={getTooltipStyle(hoveredIndex)}>
                        <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 shadow-lg">
                            <div className="absolute left-1/2 -bottom-2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent border-t-gray-900 -translate-x-1/2"></div>
                            <div className="font-bold mb-1 truncate">{events[hoveredIndex].label}</div>
                            <div>{new Date(events[hoveredIndex].timestamp).toLocaleString()}</div>
                            {events[hoveredIndex].detail && (
                                <div className="text-gray-300 mt-1 line-clamp-2">
                                    {events[hoveredIndex].detail}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                <div
                    ref={scrollRef}
                    className={`w-full h-full ${
                        expanded ? 'overflow-x-auto overflow-y-hidden px-2' : 'overflow-hidden'
                    } scrollbar-none`}
                >
                    <div className={`inline-flex items-center h-full ${
                        expanded ? 'space-x-1 pl-2' : 'space-x-0'
                    }`}>
                        {events.map((event, index) => {
                            // Handle the icon component properly
                            let IconComponent = Clock; // Default icon
                            
                            if (event.icon) {
                                // Check if event.icon is a React component (function or class)
                                if (typeof event.icon === 'function') {
                                    IconComponent = event.icon;
                                } else if (typeof event.icon === 'object' && event.icon.$$typeof) {
                                    // It's already a React element
                                    IconComponent = event.icon;
                                } else {
                                    // Default to Clock if icon is invalid
                                    IconComponent = Clock;
                                }
                            }
                            
                            return (
                                <React.Fragment key={index}>
                                    {index > 0 && (
                                        <div className={`flex items-center justify-center flex-shrink-0 ${
                                            expanded ? 'mx-1 h-full' : 'h-10'
                                        }`}>
                                            <ArrowRight 
                                                size={expanded ? 20 : 16} 
                                                className={`transition-all duration-300 ${
                                                    expanded ? 'text-blue-400' : 'text-gray-300'
                                                }`} 
                                            />
                                        </div>
                                    )}
                                    <div
                                        className={`timeline-event group ${
                                            expanded 
                                                ? 'flex flex-col justify-center items-center w-28 min-h-[140px] p-2' 
                                                : 'flex justify-center items-center w-10 h-10'
                                        } rounded border border-gray-200 bg-gray-50 text-gray-700 flex-shrink-0 relative cursor-pointer transition-all duration-300 ${
                                            expanded ? 'hover:ring-1 hover:ring-blue-200' : ''
                                        } ${
                                            isAnimating ? expanded ? 'animate-zoomIn' : 'animate-zoomOut' : ''
                                        }`}
                                        onMouseEnter={() => setHoveredIndex(index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    >
                                        {event.icon && (
                                            <div className={`flex items-center justify-center ${
                                                expanded ? 'mb-2' : 'w-full h-full'
                                            }`}>
                                                <IconComponent 
                                                    size={expanded ? 16 : 14} 
                                                    className={`transition-all duration-300 ${
                                                        event.iconColor || getIconColorClass(event.type)
                                                    } ${!expanded ? 'group-hover:scale-125' : ''}`}
                                                />
                                            </div>
                                        )}
                                        {expanded && (
                                            <>
                                                <div className="text-xs font-semibold mb-1 w-full text-center line-clamp-1 transition-opacity duration-300">
                                                    {event.label}
                                                </div>
                                                <p className="text-[10px] text-blue-700 font-bold flex items-center justify-center w-full truncate mb-1 transition-opacity duration-300">
                                                    <Clock className="w-3 h-3 mr-1 text-blue-400 flex-shrink-0" />
                                                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <p className="text-[10px] text-gray-500 w-full text-center truncate mb-1 transition-opacity duration-300">
                                                    {new Date(event.timestamp).toLocaleDateString()}
                                                </p>
                                                {event.detail && (
                                                    <p className="text-[10px] text-gray-400 w-full text-center line-clamp-2 transition-opacity duration-300">
                                                        {event.detail}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            {/* Toggle button */}
            <div className="flex items-center justify-center">
                <button
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-b-md bg-white text-orange-500 border border-t-0 border-orange-500 hover:bg-orange-50 transition-colors"
                    onClick={handleToggle}
                    aria-label={expanded ? 'Hide Timeline' : 'Show Timeline'}
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="w-3 h-3 transition-transform duration-300" />
                            <span>Hide Timeline</span>
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3 h-3 transition-transform duration-300" />
                            <span>Show Ticket Timeline</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default Timeline;