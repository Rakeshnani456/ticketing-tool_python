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
                setCanScrollLeft(scrollRef.current.scrollLeft > 0);
                setCanScrollRight(
                    scrollRef.current.scrollLeft + scrollRef.current.clientWidth < scrollRef.current.scrollWidth - 1
                );
            }
        };
        checkScroll();
        if (scrollRef.current) {
            scrollRef.current.addEventListener('scroll', checkScroll);
        }
        window.addEventListener('resize', checkScroll);
        return () => {
            if (scrollRef.current) {
                scrollRef.current.removeEventListener('scroll', checkScroll);
            }
            window.removeEventListener('resize', checkScroll);
        };
    }, [events, expanded]);

    // Scroll handlers
    const handleScrollLeft = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: -240, behavior: 'smooth' });
        }
    };
    const handleScrollRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: 240, behavior: 'smooth' });
        }
    };

    // Tooltip position logic
    const getTooltipStyle = () => {
        if (hoveredIndex === null || !timelineBarRef.current) return { display: 'none' };
        const eventEls = timelineBarRef.current.querySelectorAll('.timeline-event');
        if (!eventEls[hoveredIndex]) return { display: 'none' };
        const eventRect = eventEls[hoveredIndex].getBoundingClientRect();
        const left = eventRect.left + eventRect.width / 2;
        const top = eventRect.top;
        return {
            left: left,
            top: top - 8,
            transform: 'translateX(-50%) translateY(-100%)',
            position: 'fixed',
            zIndex: 9999,
            pointerEvents: 'none',
        };
    };

    if (!events.length) return null;
    return (
        <div className="max-w-6xl w-full mx-auto px-0 sm:px-0 md:px-1">
            <div
                ref={timelineBarRef}
                className={`bg-white border-t border-b border-gray-200 w-full relative overflow-visible transition-all duration-300 ${expanded ? 'max-h-[180px] py-1' : 'max-h-[52px] py-3'}`}
                style={{ minHeight: expanded ? 64 : 40, transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)' }}
            >
                {/* Left Arrow + Fade (expanded only) */}
                {expanded && canScrollLeft && (
                    <>
                        <div className="pointer-events-none absolute top-0 left-0 h-full w-10 z-20" style={{background: 'linear-gradient(to right, rgba(255,255,255,0.9) 60%, rgba(255,255,255,0))'}} />
                        <button
                            className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 bg-white/80 hover:bg-blue-100 rounded-full z-30 shadow border border-gray-200 transition"
                            style={{ pointerEvents: 'auto' }}
                            onClick={handleScrollLeft}
                            aria-label="Scroll timeline left"
                        >
                            <ChevronLeft className="w-5 h-5 text-blue-600" />
                        </button>
                    </>
                )}
                {/* Right Arrow + Fade (expanded only) */}
                {expanded && canScrollRight && (
                    <>
                        <div className="pointer-events-none absolute top-0 right-0 h-full w-10 z-20" style={{background: 'linear-gradient(to left, rgba(255,255,255,0.9) 60%, rgba(255,255,255,0))'}} />
                        <button
                            className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 bg-white/80 hover:bg-blue-100 rounded-full z-30 shadow border border-gray-200 transition"
                            style={{ pointerEvents: 'auto' }}
                            onClick={handleScrollRight}
                            aria-label="Scroll timeline right"
                        >
                            <ChevronRight className="w-5 h-5 text-blue-600" />
                        </button>
                    </>
                )}
                {/* Tooltip above the timeline bar */}
                {!expanded && hoveredIndex !== null && (
                    <div style={getTooltipStyle()}>
                        <div className="relative bg-gray-900 text-white text-xs rounded py-2 px-3 min-w-[140px] max-w-[220px] text-center shadow-lg">
                            <div className="absolute left-1/2 -bottom-2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent border-t-gray-900 -translate-x-1/2"></div>
                            <div className="font-bold mb-1">{events[hoveredIndex].label}</div>
                            <div>{new Date(events[hoveredIndex].timestamp).toLocaleString()}</div>
                            {events[hoveredIndex].detail && <div className="text-gray-300 mt-1">{events[hoveredIndex].detail}</div>}
                        </div>
                    </div>
                )}
                <div
                    ref={scrollRef}
                    className={
                        `w-full min-w-0 ${expanded ? 'overflow-x-auto' : 'overflow-x-hidden'} scrollbar-none overflow-y-hidden relative transition-all duration-300` +
                        (expanded ? ' py-1 min-h-[96px] pl-3 pr-3' : ' flex items-center h-full justify-start')
                    }
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        scrollbarColor: 'transparent transparent',
                        ...(expanded && { WebkitOverflowScrolling: 'touch' }),
                        ...(expanded && { WebkitScrollbar: { display: 'none' } })
                    }}
                >
                    <div className={`inline-flex items-center min-h-0 min-w-0 transition-all duration-300 ${expanded ? 'space-x-2' : 'space-x-1 px-2'}`}> {/* Adjusted space-x for expanded */}
                        {events.map((event, index) => (
                            <React.Fragment key={index}>
                                {index > 0 && (
                                    // Adjusted mx for expanded arrow
                                    <div className={`flex items-center flex-shrink-0 group/timeline-arrow ${expanded ? 'mx-2' : 'h-8'}`}>
                                        <ArrowRight size={expanded ? 22 : 20} className={`transition-colors drop-shadow-sm ${expanded ? 'text-blue-400 group-hover/timeline-arrow:text-blue-700' : 'text-gray-300'}`} />
                                    </div>
                                )}
                                <div
                                    // Adjusted w, h, and p-y for expanded event card
                                    className={`timeline-event group ${expanded ? 'flex flex-col justify-center items-center w-32 min-h-20 p-2' : 'flex justify-center items-center w-8 h-8'} rounded border border-gray-200 bg-gray-50 text-gray-700 flex-shrink-0 relative cursor-pointer transition-shadow overflow-visible${expanded ? ' hover:ring-2 hover:ring-blue-300' : ''}`}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    style={expanded ? {} : { fontSize: '10px' }}
                                >
                                    {event.icon && (
                                        <event.icon 
                                            size={expanded ? 18 : 18} 
                                            className={
                                                (event.iconColor ? event.iconColor : getIconColorClass(event.type)) +
                                                (!expanded ? ' transition-transform duration-200 group-hover:scale-150' : '')
                                            }
                                        />
                                    )} {/* Adjusted icon size for expanded */}
                                    {expanded && (
                                        <>
                                            {/* Adjusted margin-bottom for label */}
                                            <div className="flex items-center text-xs font-semibold mb-1 w-full text-center">
                                                <span className="truncate w-full" style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{event.label}</span>
                                            </div>
                                            {/* Removed extra margin-right from clock icon */}
                                            <p className="text-[10px] text-blue-700 font-bold flex items-center w-full justify-center truncate">
                                                <Clock className="w-3 h-3 mr-1 text-blue-400" />
                                                {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-[10px] text-gray-500 w-full justify-center truncate">
                                                {new Date(event.timestamp).toLocaleDateString()}
                                            </p>
                                            {event.detail && (
                                                <p className="text-[10px] text-gray-400 mt-1 w-full justify-center break-words overflow-hidden">
                                                    {event.detail.split('@')[0]}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
            {/* Toggle button for expand/collapse at the bottom */}
            <div className="flex items-center justify-center -mt-1.5 relative z-30">
                <button
                    className="flex items-center gap-1 px-4 py-1 text-xs font-semibold rounded-b-none rounded-t-md transition-colors z-30 text-yellow-500"
                    style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, position: 'relative', top: '4px' }}
                    onClick={() => setExpanded((prev) => !prev)}
                    aria-label={expanded ? 'Hide Timeline' : 'Show Timeline'}
                >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expanded ? 'Hide Timeline' : 'Show Timeline'}
                </button>
            </div>
        </div>
    );
};

export default Timeline;