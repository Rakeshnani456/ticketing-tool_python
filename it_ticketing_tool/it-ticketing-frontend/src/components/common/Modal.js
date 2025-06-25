// src/components/common/Modal.js

import React from 'react';
import { X } from 'lucide-react'; // Icon for closing the modal

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
    // If modal is not open, return null to render nothing
    if (!isOpen) return null;

    return (
        // Fixed overlay for the modal background
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
            {/* Modal content container */}
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl relative max-h-[90vh] overflow-y-auto transform scale-95 animate-scale-in">
                {/* Close button positioned at the top right */}
                <button
                    onClick={onClose}
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
