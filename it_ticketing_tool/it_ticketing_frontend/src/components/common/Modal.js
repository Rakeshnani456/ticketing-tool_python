// src/components/common/Modal.js

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react'; // Icon for closing the modal
import 'animate.css';

/**
 * Reusable Modal component for pop-up dialogs.
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - Content to be displayed inside the modal.
 * @param {string} [props.title] - Title text for the modal header.
 * @param {function} props.onClose - Function to call when the modal is requested to be closed.
 * @param {boolean} props.isOpen - Controls the visibility of the modal.
 * @returns {JSX.Element|null} A modal dialog or null if not open.
 */
const Modal = ({ children, title, onClose, isOpen }) => {
    const [show, setShow] = useState(isOpen);
    const [animateClass, setAnimateClass] = useState('animate__zoomIn');

    // Lock background scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            setShow(true);
            setAnimateClass('animate__zoomIn');
            document.body.classList.add('overflow-hidden');
        } else if (show) {
            setAnimateClass('animate__zoomOut');
            document.body.classList.remove('overflow-hidden');
        }
        return () => {
            document.body.classList.remove('overflow-hidden');
        };
    }, [isOpen]);

    // Handle animation end for closing
    const handleAnimationEnd = () => {
        if (animateClass === 'animate__zoomOut') {
            setShow(false);
        }
    };

    if (!show) return null;

    return (
        // Fixed overlay for the modal background with blur and fade
        <div className="fixed inset-0 bg-gray-600 bg-opacity-40 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300 animate-fade-in">
            {/* Modal content container with Animate.css zoomIn/zoomOut animation */}
            <div
                className={`bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl relative max-h-[90vh] overflow-y-auto animate__animated ${animateClass} animate__faster`}
                onAnimationEnd={handleAnimationEnd}
            >
                {/* Close button positioned at the top right */}
                <button
                    onClick={() => {
                        setAnimateClass('animate__zoomOut');
                        if (onClose) setTimeout(onClose, 250); // fallback in case animationend doesn't fire
                    }}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close modal"
                >
                    <X size={20} />
                </button>
                {/* Modal title, rendered only if provided */}
                {title && <h2 className="text-xl font-extrabold text-gray-800 mb-4 text-center">{title}</h2>}
                {/* Children content passed to the modal */}
                {children}
            </div>
        </div>
    );
};

export default Modal;
