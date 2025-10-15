import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useThemeContext } from '../../contexts/ThemeContext';

// TooltipBubble component for hover tooltips
function TooltipBubble({ title, children, id }) {
    const [show, setShow] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const iconRef = useRef(null);
    const { theme } = useThemeContext();

    useEffect(() => {
        if (show && iconRef.current) {
            const rect = iconRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            // Calculate tooltip width based on text content
            const tooltipWidth = Math.max(title.length * 8, 80); // Dynamic width based on text
            const tooltipHeight = 32; // Smaller height for button tooltips
            
            // Calculate optimal position - position directly under the button
            let topPosition = rect.bottom + 8;
            let leftPosition = rect.left + (rect.width / 2) - (tooltipWidth / 2); // Center the tooltip under the element
            
            // Ensure tooltip is positioned exactly under the button
            if (leftPosition < rect.left) {
                leftPosition = rect.left;
            }
            if (leftPosition + tooltipWidth > rect.right) {
                leftPosition = rect.right - tooltipWidth;
            }
            
            // Check if tooltip would go off the bottom of viewport
            if (topPosition + tooltipHeight > viewportHeight - 10) {
                // Position above the element instead
                topPosition = rect.top - tooltipHeight - 8;
                // Keep the same centered positioning for above placement
                leftPosition = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            }
            
            // Ensure tooltip doesn't go off-screen to the right
            if (leftPosition + tooltipWidth > viewportWidth - 10) {
                leftPosition = viewportWidth - tooltipWidth - 10;
            }
            
            // Ensure tooltip doesn't go off-screen to the left
            if (leftPosition < 10) {
                leftPosition = 10;
            }
            
            setCoords({
                top: topPosition,
                left: leftPosition
            });
        }
    }, [show]);

    return (
        <div
            ref={iconRef}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            style={{ position: 'relative', display: 'inline-block', isolation: 'isolate' }}
        >
            {children}
            {show && createPortal(
                <div
                    data-tooltip-id={id || 'tooltip'}
                    style={{
                        position: 'fixed',
                        top: coords.top,
                        left: coords.left,
                        backgroundColor: theme === 'dark' ? '#374151' : '#1f2937',
                        color: theme === 'dark' ? '#f9fafb' : '#ffffff',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        zIndex: 9999,
                        boxShadow: theme === 'dark' 
                            ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        animation: 'fadeIn 0.2s ease-out',
                        border: theme === 'dark' ? '1px solid #4b5563' : 'none'
                    }}
                >
                    {title}
                </div>,
                document.body
            )}
        </div>
    );
}

// LeftMenuTooltipBubble component for left menu items - positions tooltips to the right
function LeftMenuTooltipBubble({ title, children, id }) {
    const [show, setShow] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const iconRef = useRef(null);
    const { theme } = useThemeContext();

    useEffect(() => {
        if (show && iconRef.current) {
            const rect = iconRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const tooltipWidth = 120; // Approximate tooltip width for menu items
            const tooltipHeight = 32; // Approximate tooltip height
            
            // Account for header height (typically around 64px) to prevent cutoff
            const headerHeight = 64;
            const minTopPosition = headerHeight + 10; // Ensure tooltip is below header
            
            // Position to the right of the icon
            let topPosition = rect.top + (rect.height / 2) - (tooltipHeight / 2); // Center vertically with the icon
            let leftPosition = rect.right + 8; // Position to the right of the icon
            
            // Ensure tooltip is not cut off by the header
            if (topPosition < minTopPosition) {
                topPosition = minTopPosition;
            }
            
            // Check if tooltip would go off the right edge of viewport
            if (leftPosition + tooltipWidth > viewportWidth - 10) {
                // Position to the left of the icon instead
                leftPosition = rect.left - tooltipWidth - 8;
            }
            
            // Check if tooltip would go off the bottom of viewport
            if (topPosition + tooltipHeight > viewportHeight - 10) {
                topPosition = viewportHeight - tooltipHeight - 10;
            }
            
            // Check if tooltip would go off the top of viewport (with header consideration)
            if (topPosition < minTopPosition) {
                topPosition = minTopPosition;
            }
            
            // Ensure tooltip doesn't go off-screen to the left
            if (leftPosition < 10) {
                leftPosition = 10;
            }
            
            setCoords({
                top: topPosition,
                left: leftPosition
            });
        }
    }, [show]);

    return (
        <div
            ref={iconRef}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            style={{ position: 'relative', display: 'inline-block', isolation: 'isolate' }}
        >
            {children}
            {show && createPortal(
                <div
                    data-tooltip-id={id || 'left-menu-tooltip'}
                    style={{
                        position: 'fixed',
                        top: coords.top,
                        left: coords.left,
                        backgroundColor: theme === 'dark' ? '#374151' : '#1f2937',
                        color: theme === 'dark' ? '#f9fafb' : '#ffffff',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        zIndex: 99999,
                        boxShadow: theme === 'dark' 
                            ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        animation: 'fadeIn 0.2s ease-out',
                        border: theme === 'dark' ? '1px solid #4b5563' : 'none'
                    }}
                >
                    {title}
                </div>,
                document.body
            )}
        </div>
    );
}

export default TooltipBubble;
export { LeftMenuTooltipBubble };