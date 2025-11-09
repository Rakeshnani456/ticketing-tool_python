import React, { useState, useRef } from 'react';
import { Search, Calendar, ChevronDown, UploadCloud, X } from 'lucide-react';

/**
 * Compact Create Ticket Form Component
 * Designed with narrow form fields and a simple, compact layout
 */
const CompactCreateTicketForm = ({ 
    user, 
    onClose, 
    showFlashMessage, 
    onTicketCreated, 
    onSubmit 
}) => {
    const [formData, setFormData] = useState({
        request_type: 'reissue_request',
        pnr: '',
        passenger_name: '',
        ticket_number: '',
        reissue_reason: 'voluntary_reissue',
        change_date: '',
        flight_no: '',
        remarks: ''
    });

    const [attachmentFiles, setAttachmentFiles] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    // Request type options
    const requestTypes = [
        { value: 'reissue_request', label: 'Reissue Request' },
        { value: 'refund_request', label: 'Refund Request' },
        { value: 'cancel_request', label: 'Cancel Request' },
        { value: 'other', label: 'Other' }
    ];

    // Reissue reason options
    const reissueReasons = [
        { value: 'voluntary_reissue', label: 'Voluntary Reissue' },
        { value: 'involuntary_reissue', label: 'Involuntary Reissue' },
        { value: 'date_change', label: 'Date Change' },
        { value: 'name_correction', label: 'Name Correction' },
        { value: 'other', label: 'Other' }
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleDateChange = (e) => {
        setFormData(prev => ({
            ...prev,
            change_date: e.target.value
        }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = files.filter(file => {
            const allowedTypes = [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            return allowedTypes.includes(file.type) && file.size <= 10 * 1024 * 1024;
        });
        setAttachmentFiles(prev => [...prev, ...validFiles]);
        e.target.value = '';
    };

    const removeFile = (index) => {
        setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        const validFiles = files.filter(file => {
            const allowedTypes = [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            return allowedTypes.includes(file.type) && file.size <= 10 * 1024 * 1024;
        });
        setAttachmentFiles(prev => [...prev, ...validFiles]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Call the onSubmit prop if provided, otherwise use default handler
            if (onSubmit) {
                await onSubmit(formData, attachmentFiles);
            } else {
                // Default submission logic
                console.log('Form Data:', formData);
                console.log('Attachments:', attachmentFiles);
                showFlashMessage?.('Ticket submitted successfully!', 'success');
                onTicketCreated?.();
            }
        } catch (error) {
            console.error('Error submitting ticket:', error);
            showFlashMessage?.('Error submitting ticket. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };


    return (
        <>
            <style>{`
                .compact-create-ticket-form-container {
                    border: none !important;
                    outline: none !important;
                    box-shadow: none !important;
                }
                .compact-create-ticket-form-container:focus,
                .compact-create-ticket-form-container:focus-within {
                    outline: none !important;
                    border: none !important;
                    box-shadow: none !important;
                }
            `}</style>
            <div className="compact-create-ticket-form-container w-full max-w-6xl mx-auto p-5 bg-white">
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Create New Ticket</h1>
                <p className="text-sm text-gray-600">Fill up all the information here, then click submit button</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* First Row: Request Type, PNR, Passenger Name, Ticket Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Select Request Type */}
                    <div>
                        <label htmlFor="request_type" className="block text-xs font-semibold text-gray-700 mb-1">
                            Select Request Type <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                id="request_type"
                                name="request_type"
                                value={formData.request_type}
                                onChange={handleSelectChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 appearance-none bg-white pr-8"
                                required
                            >
                                {requestTypes.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Search PNR */}
                    <div>
                        <label htmlFor="pnr" className="block text-xs font-semibold text-gray-700 mb-1">
                            Search PNR
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                id="pnr"
                                name="pnr"
                                value={formData.pnr}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 pr-9"
                                placeholder="02AU6FD"
                            />
                            <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Passenger Name */}
                    <div>
                        <label htmlFor="passenger_name" className="block text-xs font-semibold text-gray-700 mb-1">
                            Passanger Name
                        </label>
                        <input
                            type="text"
                            id="passenger_name"
                            name="passenger_name"
                            value={formData.passenger_name}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="Mark Andarson"
                        />
                    </div>

                    {/* Ticket Number */}
                    <div>
                        <label htmlFor="ticket_number" className="block text-xs font-semibold text-gray-700 mb-1">
                            Ticket Number
                        </label>
                        <input
                            type="text"
                            id="ticket_number"
                            name="ticket_number"
                            value={formData.ticket_number}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="996502333736727"
                        />
                    </div>
                </div>

                {/* Second Row: Reissue Reason, Change Date, Flight No, Remarks (wider) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Choose Reissue Reason */}
                    <div>
                        <label htmlFor="reissue_reason" className="block text-xs font-semibold text-gray-700 mb-1">
                            Choose Reissue Reason
                        </label>
                        <div className="relative">
                            <select
                                id="reissue_reason"
                                name="reissue_reason"
                                value={formData.reissue_reason}
                                onChange={handleSelectChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 appearance-none bg-white pr-8"
                            >
                                {reissueReasons.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Change Date */}
                    <div>
                        <label htmlFor="change_date" className="block text-xs font-semibold text-gray-700 mb-1">
                            Change Date
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                id="change_date"
                                name="change_date"
                                value={formData.change_date}
                                onChange={handleDateChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 pr-9"
                            />
                            <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Flight No */}
                    <div>
                        <label htmlFor="flight_no" className="block text-xs font-semibold text-gray-700 mb-1">
                            Flight No
                        </label>
                        <input
                            type="text"
                            id="flight_no"
                            name="flight_no"
                            value={formData.flight_no}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="BG602"
                        />
                    </div>

                    {/* Remarks - Wider field, spans the 4th column */}
                    <div>
                        <label htmlFor="remarks" className="block text-xs font-semibold text-gray-700 mb-1">
                            Remarks
                        </label>
                        <textarea
                            id="remarks"
                            name="remarks"
                            value={formData.remarks}
                            onChange={handleInputChange}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                            placeholder="Write your remarks"
                        />
                    </div>
                </div>

                {/* Attachments Area - Compact */}
                <div className="mt-4">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Attachments
                    </label>
                    <div
                        className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                            isDragOver 
                                ? 'border-blue-400 bg-blue-50' 
                                : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ maxWidth: '600px' }}
                    >
                        <div className="flex flex-col items-center justify-center gap-2 cursor-pointer text-center">
                            <UploadCloud className="h-5 w-5 text-gray-400" />
                            <span className="text-xs text-gray-600">
                                Drop files here or click to browse
                            </span>
                            <span className="text-xs text-gray-500">
                                Supported: PDF, JPG, PNG, DOC, DOCX (max 10MB)
                            </span>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    {/* Selected Files List - Compact */}
                    {attachmentFiles.length > 0 && (
                        <div className="mt-2 space-y-1" style={{ maxWidth: '600px' }}>
                            {attachmentFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded text-xs border border-gray-200">
                                    <span className="text-gray-700 truncate flex-1">{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="ml-2 text-red-500 hover:text-red-700 p-1"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <div className="mt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        {loading ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                </div>
            </form>
        </div>
        </>
    );
};

export default CompactCreateTicketForm;
