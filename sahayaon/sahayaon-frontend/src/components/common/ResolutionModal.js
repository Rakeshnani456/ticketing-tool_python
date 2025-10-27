// ResolutionModal.js - Modal for capturing time spent and closure notes before resolving a ticket

import React, { useState } from 'react';
import { XCircle, Clock, FileText, AlertCircle, Loader2, Ticket, User } from 'lucide-react';

const ResolutionModal = ({
    isOpen,
    onClose,
    onConfirm,
    timeSpent,
    setTimeSpent,
    closureNotes,
    setClosureNotes,
    loading = false,
    ticket = null,
    user = null
}) => {
    const [errors, setErrors] = useState({
        timeSpent: '',
        closureNotes: ''
    });

    const validateAndConfirm = () => {
        const newErrors = {
            timeSpent: '',
            closureNotes: ''
        };

        // Validate time spent
        if (!timeSpent.trim()) {
            newErrors.timeSpent = 'Time spent is required';
        } else if (!/^\d{1,4}$/.test(timeSpent.trim())) {
            newErrors.timeSpent = 'Please enter a valid number (1-4 digits)';
        }

        // Validate closure notes
        if (!closureNotes.trim()) {
            newErrors.closureNotes = 'Closure notes are required';
        }

        setErrors(newErrors);

        if (!newErrors.timeSpent && !newErrors.closureNotes) {
            onConfirm();
        }
    };

    const handleTimeSpentChange = (e) => {
        const value = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
        setTimeSpent(value);
        if (errors.timeSpent) {
            setErrors({ ...errors, timeSpent: '' });
        }
    };

    const handleClosureNotesChange = (e) => {
        setClosureNotes(e.target.value);
        if (errors.closureNotes) {
            setErrors({ ...errors, closureNotes: '' });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '60px' }}>
            {/* Background overlay */}
            <div 
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                onClick={onClose}
            ></div>

            {/* Modal panel - Centered */}
            <div className="relative inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all max-w-2xl w-full mx-4 max-h-[calc(90vh-60px)] overflow-y-auto">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 px-4 py-3 border-b border-green-300">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-emerald-900 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-emerald-600" />
                                Resolve Ticket
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                disabled={loading}
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-emerald-700 font-medium">
                            Provide the following information to resolve this ticket.
                        </p>
                    </div>

                    {/* Content */}
                    <div className="bg-white px-4 py-3">
                        {/* Ticket Details Section */}
                        {ticket && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <Ticket className="w-4 h-4 text-indigo-600" />
                                    <h4 className="font-semibold text-xs text-indigo-900">Ticket Details</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="font-bold text-indigo-700">Ticket ID:</span>
                                        <span className="ml-2 text-indigo-900 font-semibold">{ticket.tracking_id || ticket.display_id || ticket.id?.substring(0, 10).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <span className="font-bold text-indigo-700">Priority:</span>
                                        <span className={`ml-2 px-2 py-0.5 rounded font-semibold ${
                                            ticket.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                                            ticket.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                                            ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-green-100 text-green-800'
                                        }`}>
                                            {ticket.priority}
                                        </span>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="font-bold text-indigo-700">Subject:</span>
                                        <p className="ml-2 text-indigo-900 font-medium line-clamp-2">{ticket.short_description || ticket.subject || 'N/A'}</p>
                                    </div>
                                    {ticket.assigned_to_email && (
                                        <div className="sm:col-span-2">
                                            <span className="font-bold text-indigo-700">Assigned To:</span>
                                            <span className="ml-2 text-indigo-900 font-semibold">{ticket.assigned_to_email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Closed By Information */}
                        {user && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-purple-600" />
                                    <div>
                                        <p className="text-xs font-semibold text-purple-900">Closed By:</p>
                                        <p className="text-sm font-semibold text-purple-700">{user.email || user.name || 'Current User'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {/* Time Spent */}
                            <div>
                                <label className="block text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                    Time Spent (minutes) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={timeSpent}
                                    onChange={handleTimeSpentChange}
                                    placeholder="Enter time in minutes (e.g., 45)"
                                    disabled={loading}
                                    className={`w-full px-2.5 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                                        errors.timeSpent 
                                            ? 'border-red-500 bg-red-50' 
                                            : 'border-gray-300 bg-white hover:border-gray-400'
                                    } ${loading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                />
                                {errors.timeSpent && (
                                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                        <XCircle className="w-3 h-3" />
                                        {errors.timeSpent}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-blue-600 font-medium">
                                    Enter the total time spent working on this ticket in minutes
                                </p>
                            </div>

                            {/* Closure Notes */}
                            <div>
                                <label className="block text-xs font-semibold text-emerald-700 mb-1.5 flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                    Closure Notes <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={closureNotes}
                                    onChange={handleClosureNotesChange}
                                    rows={4}
                                    placeholder="Describe the resolution steps, final status, and any important details..."
                                    disabled={loading}
                                    className={`w-full px-2.5 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none ${
                                        errors.closureNotes 
                                            ? 'border-red-500 bg-red-50' 
                                            : 'border-gray-300 bg-white hover:border-gray-400'
                                    } ${loading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                />
                                {errors.closureNotes && (
                                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                        <XCircle className="w-3 h-3" />
                                        {errors.closureNotes}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-emerald-600 font-medium">
                                    Provide details about how this ticket was resolved
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={validateAndConfirm}
                            disabled={loading}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-md hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {loading ? 'Resolving...' : 'Resolve Ticket'}
                        </button>
                    </div>
            </div>
        </div>
    );
};

export default ResolutionModal;

