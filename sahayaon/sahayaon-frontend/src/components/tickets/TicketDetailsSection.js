// src/components/tickets/TicketDetailsSection.js

import React from 'react';
import { User, Calendar, Paperclip, Download, MessageSquare, Upload, AlertCircle, X } from 'lucide-react';
import UserProfilePopup from '../common/UserProfilePopup';

// Import file icons
import PdfIcon from '../../assets/icons/PdfIcon.svg';
import DocIcon from '../../assets/icons/DocIcon.svg';
import JpgIcon from '../../assets/icons/JpgIcon.svg';
import PngIcon from '../../assets/icons/PngIcon.svg';
import TxtIcon from '../../assets/icons/TxtIcon.svg';
import GenericFileIcon from '../../assets/icons/FileIcon.svg';

const FieldBox = ({ children, className = "", isDisplayOnly = false, hasError = false }) => (
    <div className={`FieldBox border px-2 sm:px-3 py-1.5 sm:py-2 h-auto min-h-[36px] sm:h-9 flex items-center rounded-md transition-all duration-200
        ${isDisplayOnly ? 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 cursor-text border-gray-200 overflow-hidden' : 'bg-white border-gray-300 hover:border-blue-400'}
        ${hasError ? 'border-red-500 ring-2 ring-red-200 bg-red-50' : ''}
        ${className}`}>
        {children}
    </div>
);

const EditableTextarea = ({ id, value, onChange, onBlur, rows = 3, className = "", disabled, hasError = false, inputRef, maxLength }) => (
    <textarea
        id={id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        rows={rows}
        ref={inputRef}
        className={`rounded-md px-2 py-1.5 focus:outline-none resize-none flex-shrink-0 w-full transition-all duration-200 text-sm border border-gray-300
            ${disabled ? 'bg-gradient-to-r from-gray-50 to-gray-100 cursor-not-allowed text-gray-600' : 'bg-white hover:border-blue-400'}
            ${hasError ? 'border-red-500 bg-red-50' : ''}
            ${className}`}
        disabled={disabled}
        maxLength={maxLength}
    />
);

const FileIcon = ({ fileName, className = "w-10 h-10" }) => {
    const fileExtension = fileName.split('.').pop().toLowerCase();

    switch (fileExtension) {
        case 'pdf':
            return <img src={PdfIcon} alt="PDF Icon" className={className} />;
        case 'doc':
        case 'docx':
            return <img src={DocIcon} alt="Word Icon" className={className} />;
        case 'jpg':
        case 'jpeg':
            return <img src={JpgIcon} alt="JPG Icon" className={className} />;
        case 'png':
            return <img src={PngIcon} alt="PNG Icon" className={className} />;
        case 'txt':
            return <img src={TxtIcon} alt="Text Icon" className={className} />;
        default:
            return <img src={GenericFileIcon} alt="Generic File Icon" className={className} />;
    }
};

const TicketDetailsSection = ({
    ticket,
    isEditing,
    canEdit,
    editableFields,
    handleEditChange,
    uploadingFiles,
    uploadProgress,
    canAddAttachments,
    handleFileChange,
    profilePopup,
    showProfilePopup,
    cancelShowProfilePopup,
    hidePopup,
    popupHideTimeout,
    onCommentsClick,
    onAttachmentsClick
}) => {
    const [showAllAttachments, setShowAllAttachments] = React.useState(false);
    const [unsupportedFileError, setUnsupportedFileError] = React.useState('');
    const [selectedFiles, setSelectedFiles] = React.useState([]);
    const [isUploading, setIsUploading] = React.useState(false);
    const [localUploadingFiles, setLocalUploadingFiles] = React.useState([]);
    const [uploadingToUploaded, setUploadingToUploaded] = React.useState({});
    
    const handleCommentsClick = () => {
        const commentsSection = document.getElementById('comments-section');
        if (commentsSection) commentsSection.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAttachmentsClick = () => {
        const attachmentsSection = document.getElementById('attachments-section');
        if (attachmentsSection) attachmentsSection.scrollIntoView({ behavior: 'smooth' });
    };

    const handleLocalFileChange = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = [];
        let hasUnsupportedTypes = false;
        let hasOversizedFiles = false;
        let unsupportedTypeNames = [];
        let oversizedFileNames = [];

        for (const file of files) {
            const allowedTypes = [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/zip',
                'application/x-zip-compressed'
            ];
            
            if (!allowedTypes.includes(file.type)) {
                hasUnsupportedTypes = true;
                unsupportedTypeNames.push(file.name);
                continue;
            }
            
            if (file.size > 10 * 1024 * 1024) {
                hasOversizedFiles = true;
                oversizedFileNames.push(file.name);
                continue;
            }
            
            validFiles.push(file);
        }

        // Helper function to truncate filenames while keeping extensions
        const truncateFileName = (fileName, maxLength = 20) => {
            if (fileName.length <= maxLength) return fileName;
            
            const lastDotIndex = fileName.lastIndexOf('.');
            if (lastDotIndex === -1) {
                // No extension, truncate from middle
                return fileName.substring(0, maxLength - 3) + '...';
            }
            
            const name = fileName.substring(0, lastDotIndex);
            const extension = fileName.substring(lastDotIndex);
            
            if (name.length <= maxLength - extension.length - 3) {
                return fileName;
            }
            
            const truncatedName = name.substring(0, maxLength - extension.length - 3) + '...';
            return truncatedName + extension;
        };

        // Set error message for different types of issues
        let errorMessage = '';
        if (hasUnsupportedTypes && hasOversizedFiles) {
            const truncatedUnsupported = unsupportedTypeNames.map(name => truncateFileName(name)).join(', ');
            const truncatedOversized = oversizedFileNames.map(name => truncateFileName(name)).join(', ');
            errorMessage = `Unsupported file types: ${truncatedUnsupported}. Files too large (>10MB): ${truncatedOversized}.`;
        } else if (hasUnsupportedTypes) {
            const truncatedNames = unsupportedTypeNames.map(name => truncateFileName(name)).join(', ');
            errorMessage = `Unsupported file types: ${truncatedNames}.`;
        } else if (hasOversizedFiles) {
            const truncatedNames = oversizedFileNames.map(name => truncateFileName(name)).join(', ');
            errorMessage = `Files too large (>10MB): ${truncatedNames}.`;
        }
        
        if (errorMessage) {
            setUnsupportedFileError(errorMessage);
            
            // Clear error after 5 seconds
            setTimeout(() => {
                setUnsupportedFileError('');
            }, 5000);
        } else {
            setUnsupportedFileError('');
        }

        // Add valid files to selected files instead of immediately uploading
        if (validFiles.length > 0) {
            setSelectedFiles(prev => {
                const existingFileNames = prev.map(f => f.name);
                const newFiles = validFiles.filter(file => !existingFileNames.includes(file.name));
                return [...prev, ...newFiles];
            });
        }
        
        // Clear the input value to allow reselection of the same file
        e.target.value = '';
    };

    const removeSelectedFile = (indexToRemove) => {
        setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const clearAllSelectedFiles = () => {
        setSelectedFiles([]);
    };

    const handleUploadFiles = async () => {
        if (selectedFiles.length === 0) return;
        
        setIsUploading(true);
        
        try {
            // Create a synthetic event object to pass to handleFileChange
            const syntheticEvent = {
                target: {
                    files: selectedFiles
                }
            };
            
            // Move files from selected to local uploading state
            const filesToUpload = selectedFiles.map(file => ({
                file: file,
                status: 'uploading',
                id: `temp-${Date.now()}-${Math.random()}`
            }));
            
            // Clear selected files immediately (they disappear from "Files Ready for Upload")
            setSelectedFiles([]);
            
            // Add files to local uploading state (they appear in attachments grid with loading)
            setLocalUploadingFiles(prev => [...prev, ...filesToUpload]);
            
            // Call the parent's file change handler
            await handleFileChange(syntheticEvent);
            
            // Mark files as transitioning from uploading to uploaded
            const transitionFiles = {};
            filesToUpload.forEach(fileObj => {
                transitionFiles[fileObj.file.name] = {
                    status: 'transitioning',
                    timestamp: Date.now()
                };
            });
            setUploadingToUploaded(prev => ({ ...prev, ...transitionFiles }));
            
            // After a short delay, remove the transitioning files
            setTimeout(() => {
                setLocalUploadingFiles([]);
                setUploadingToUploaded({});
            }, 1500); // Give time for smooth transition
            
        } catch (error) {
            console.error('Upload failed:', error);
            // If upload fails, we could potentially restore files to selected state
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white p-3 sm:p-4 w-full min-w-0 max-w-full overflow-x-hidden">
            <div className="mb-2 sm:mb-3 md:mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                <div className="flex items-center flex-shrink-0">
                    <span className="text-xs sm:text-sm md:text-base font-medium tracking-wide uppercase text-gray-900" style={{ fontWeight: 500, color: '#111827' }}>Ticket Details</span>
                </div>
                
                {/* Comments and Attachments Count Tags */}
                {ticket && (
                    <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-[10px] flex-wrap">
                        <button
                            className="flex items-center gap-1 px-1 py-0.5 transition-all duration-200 justify-center min-w-0 flex-shrink-0 underline text-blue-400"
                            onClick={onCommentsClick}
                            title="Go to comments"
                        >
                            <MessageSquare className="w-3 h-3 flex-shrink-0 text-blue-400" />
                            <span className="font-medium truncate">
                                {ticket.comments && ticket.comments.length > 0 
                                    ? `${ticket.comments.length} comment${ticket.comments.length > 1 ? 's' : ''}` 
                                    : '0 comments'
                                }
                            </span>
                        </button>
                        <button
                            className="flex items-center gap-1 px-1 py-0.5 transition-all duration-200 justify-center min-w-0 flex-shrink-0 underline text-green-600"
                            onClick={onAttachmentsClick}
                            title="Go to attachments"
                        >
                            <Paperclip size={12} className="flex-shrink-0 text-green-600" />
                            <span className="font-medium truncate">
                                {ticket.attachments && ticket.attachments.length > 0 
                                    ? `${ticket.attachments.length} attachment${ticket.attachments.length > 1 ? 's' : ''}` 
                                    : '0 attachments'
                                }
                            </span>
                        </button>
                    </div>
                )}
            </div>
            
            {/* Ticket Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 w-full min-w-0 max-w-full overflow-x-hidden">
                {/* Left column */}
                <div className="flex flex-col gap-1.5 sm:gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                    {/* Ticket ID */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                        <label className="text-xs sm:text-sm font-medium text-gray-900 w-full sm:w-20 lg:w-24 shrink-0 tracking-tight" style={{ fontWeight: 500, color: '#111827' }}>Ticket ID:</label>
                        <FieldBox className="w-full flex-1 min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                            <span className="text-xs sm:text-sm font-medium text-blue-700 truncate flex-1 min-w-0 max-w-full tracking-wide" style={{ fontWeight: 500, color: '#1e40af' }}>{ticket.display_id}</span>
                        </FieldBox>
                    </div>
                    {/* Requested by */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                        <label className="text-xs sm:text-sm font-medium text-gray-900 w-full sm:w-20 lg:w-24 shrink-0 tracking-tight" style={{ fontWeight: 500, color: '#111827' }}>Requested by:</label>
                        <FieldBox className="w-full flex-1 min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                            <span
                                className="text-xs sm:text-sm font-normal text-gray-800 truncate flex-1 min-w-0 max-w-full cursor-pointer transition-colors hover:text-blue-600"
                                onMouseEnter={() => showProfilePopup({ email: ticket.reporter_email, fullName: ticket.reporter_name }, null)}
                                onMouseLeave={() => { cancelShowProfilePopup(); hidePopup(); }}
                            >
                                {ticket.reporter_email ? ticket.reporter_email : <span className="italic text-gray-500">Not specified</span>}
                            </span>
                            <UserProfilePopup
                                user={profilePopup.user}
                                anchorRef={profilePopup.anchorRef}
                                visible={profilePopup.visible}
                                onMouseEnter={() => {
                                    if (popupHideTimeout.current) clearTimeout(popupHideTimeout.current);
                                }}
                                onMouseLeave={() => {
                                    hidePopup();
                                }}
                            />
                        </FieldBox>
                    </div>
                    {/* Asset ID */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                        <label className="text-xs sm:text-sm font-medium text-gray-900 w-full sm:w-20 lg:w-24 shrink-0 tracking-tight" style={{ fontWeight: 500, color: '#111827' }}>Asset ID:</label>
                        <FieldBox className="w-full flex-1 min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                            <span className="text-xs sm:text-sm font-normal text-gray-800 truncate flex-1 min-w-0 max-w-full" style={{ fontWeight: 400, color: '#1f2937' }}>{ticket.hostname_asset_id ? ticket.hostname_asset_id : <span className="italic text-gray-500">Not specified</span>}</span>
                        </FieldBox>
                    </div>
                </div>
                
                {/* Right column */}
                <div className="flex flex-col gap-1.5 sm:gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                    {/* Requested for */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                        <label className="text-xs sm:text-sm font-medium text-gray-900 w-full sm:w-20 lg:w-24 shrink-0 tracking-tight" style={{ fontWeight: 500, color: '#111827' }}>Requested for:</label>
                        <FieldBox className="w-full flex-1 min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                            <span
                                className="text-xs sm:text-sm font-normal text-gray-800 truncate flex-1 min-w-0 max-w-full cursor-pointer transition-colors hover:text-blue-600"
                                onMouseEnter={() => showProfilePopup({ email: ticket.request_for_email, fullName: ticket.request_for_name }, null)}
                                onMouseLeave={() => { cancelShowProfilePopup(); hidePopup(); }}
                            >
                                {ticket.request_for_email ? ticket.request_for_email : <span className="italic text-gray-500">Not specified</span>}
                            </span>
                            <UserProfilePopup
                                user={profilePopup.user}
                                anchorRef={profilePopup.anchorRef}
                                visible={profilePopup.visible}
                                onMouseEnter={() => {
                                    if (popupHideTimeout.current) clearTimeout(popupHideTimeout.current);
                                }}
                                onMouseLeave={() => {
                                    hidePopup();
                                }}
                            />
                        </FieldBox>
                    </div>
                    {/* Contact No */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                        <label className="text-xs sm:text-sm font-medium text-gray-900 w-full sm:w-20 lg:w-24 shrink-0 tracking-tight" style={{ fontWeight: 500, color: '#111827' }}>Contact No:</label>
                        <FieldBox className="w-full flex-1 min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                            <span className="text-xs sm:text-sm font-normal text-gray-800 truncate flex-1 min-w-0 max-w-full" style={{ fontWeight: 400, color: '#1f2937' }}>{ticket.contact_number ? ticket.contact_number : <span className="italic text-gray-500">Not specified</span>}</span>
                        </FieldBox>
                    </div>
                    {/* Created */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                        <label className="text-xs sm:text-sm font-medium text-gray-900 w-full sm:w-20 lg:w-24 shrink-0 tracking-tight" style={{ fontWeight: 500, color: '#111827' }}>Created:</label>
                        <FieldBox className="w-full flex-1 min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0 text-gray-500" />
                            <span className="text-xs sm:text-sm font-normal text-gray-800 truncate flex-1 min-w-0 max-w-full" style={{ fontWeight: 400, color: '#1f2937' }}>{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : <span className="italic text-gray-500">Not specified</span>}</span>
                        </FieldBox>
                    </div>
                </div>
            </div>

            {/* Long Description */}
            <div className="mb-2 sm:mb-3 md:mb-4 mt-2 sm:mt-3 md:mt-4 w-full min-w-0 max-w-full overflow-x-hidden">
                <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2 tracking-tight uppercase" style={{ fontWeight: 500, color: '#111827' }}>
                    Description:
                </label>
                <div className="border border-gray-200 px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-md w-full min-w-0 max-w-full overflow-y-auto" style={{ height: '200px' }}>
                    {ticket.long_description ? (
                        <span className="text-sm text-gray-800 whitespace-pre-wrap break-words w-full min-w-0 max-w-full font-normal" style={{ lineHeight: '1.6', wordWrap: 'break-word', overflowWrap: 'break-word', fontFamily: 'inherit', fontWeight: 400, color: '#1f2937' }}>
                            {ticket.long_description}
                        </span>
                    ) : (
                        <span className="text-gray-500 text-xs col-span-full text-left py-2 font-normal italic" style={{ lineHeight: '1.4', wordWrap: 'break-word', overflowWrap: 'break-word', fontFamily: 'inherit' }}>No description provided.
                        </span>
                    )}
                </div>
            </div>

            {/* Attachments section */}
            <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center mb-2 sm:mb-3 justify-between gap-2 sm:gap-0 w-full min-w-0 max-w-full overflow-x-hidden">
                    <div className="flex items-center gap-1.5 sm:gap-2 py-1 flex-wrap min-w-0">
                        <h3 className="text-xs sm:text-sm font-medium tracking-wide uppercase text-gray-900 flex items-center flex-shrink-0" style={{ fontWeight: 500, color: '#111827' }}>
                            Attachments
                        </h3>
                        {unsupportedFileError && (
                            <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-red-50 border border-red-200 rounded-md">
                                <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                                <div className="text-xs text-red-600 font-medium">
                                    <span className="font-semibold">Error: </span>
                                    <span className="font-normal">{unsupportedFileError}</span>
                                    <span className="font-normal">. Allowed types: </span>
                                    <span className="font-semibold text-blue-600">png, jpg, pdf, word, excel, zip (max 10mb)</span>
                                </div>
                            </div>
                        )}
                        {!canAddAttachments && (
                            <Paperclip className="w-4 h-4 text-green-600 ml-1" />
                        )}
                    </div>
                    <input
                        id="attachment-upload-btn"
                        type="file"
                        multiple
                        accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                        onChange={handleLocalFileChange}
                        hidden
                        disabled={!canAddAttachments}
                        value=""
                    />
                </div>

                {/* Upload Button */}
                {canAddAttachments && (
                    <div className="mb-3 flex flex-col items-start gap-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                const input = document.getElementById('attachment-upload-btn');
                                if (input) input.click();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors duration-200"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Files</span>
                        </button>
                        <p className="text-[10px] sm:text-xs text-gray-500">
                            Supported: PNG, JPG, PDF, Word, Excel, ZIP (max 10MB)
                        </p>
                    </div>
                )}

                {/* Selected Files Display */}
                {selectedFiles.length > 0 && (
                    <div className="mb-4 p-3 bg-white border border-orange-200 rounded-lg shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                <h4 className="text-xs font-bold text-orange-900 tracking-wide">Files Ready for Upload</h4>
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-bold rounded-full">
                                    {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
                                </span>
                                <button
                                    onClick={handleUploadFiles}
                                    disabled={isUploading}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium text-xs transition-all duration-200 ${
                                        isUploading
                                            ? 'bg-gray-400 cursor-not-allowed text-white'
                                            : 'bg-orange-600 hover:bg-orange-700 text-white'
                                    }`}
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="animate-spin h-3 w-3">
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                                </svg>
                                            </div>
                                            <span>Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-3 h-3" />
                                            <span>Upload</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <button
                                onClick={clearAllSelectedFiles}
                                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 px-3 py-1.5 rounded-md transition-all duration-200 font-medium border border-red-200 hover:border-red-300"
                                title="Cancel file selection"
                            >
                                Cancel
                            </button>
                        </div>
                        
                        <div className="space-y-1.5">
                            {selectedFiles.map((file, index) => (
                                <div key={`${file.name}-${index}`} className="flex items-center justify-between p-2 bg-orange-25 rounded-md border border-orange-100 hover:border-orange-200 transition-all duration-200">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <FileIcon fileName={file.name} className="w-8 h-8 text-orange-600" />
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-xs text-gray-900 truncate font-semibold">
                                                {file.name}
                                            </span>
                                            <span className="text-[10px] text-gray-600 font-medium">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeSelectedFile(index)}
                                        className="text-xs text-red-600 hover:text-red-700 hover:underline transition-all duration-200 flex-shrink-0 font-semibold"
                                        title="Remove file"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                

                
                {/* Attachments section - Shows both existing and uploading files */}
                <div id="attachments-section" className="w-full min-w-0 max-w-full overflow-x-hidden">
                    {/* Combine existing attachments with uploading files */}
                    {(() => {
                        const allAttachments = [];
                        
                        // Add existing attachments
                        if (ticket.attachments && ticket.attachments.length > 0) {
                            allAttachments.push(...ticket.attachments.map(att => ({ ...att, type: 'existing' })));
                        }
                        
                        // Add uploading files from local state
                        if (localUploadingFiles && localUploadingFiles.length > 0) {
                            allAttachments.push(...localUploadingFiles.map(fileObj => {
                                const fileName = fileObj.file.name;
                                const isTransitioning = uploadingToUploaded[fileName]?.status === 'transitioning';
                                
                                return {
                                    fileName: fileName,
                                    url: '#', // Placeholder for uploading files
                                    added_at: new Date().toISOString(),
                                    type: isTransitioning ? 'transitioning' : 'uploading'
                                };
                            }));
                        }
                        
                        // Sort attachments by date: newest first (uploading files will be at the top)
                        allAttachments.sort((a, b) => {
                            // Uploading files always come first
                            if (a.type === 'uploading' && b.type !== 'uploading') return -1;
                            if (a.type !== 'uploading' && b.type === 'uploading') return 1;
                            
                            // For existing files, sort by date (newest first)
                            if (a.type === 'existing' && b.type === 'existing') {
                                return new Date(b.added_at) - new Date(a.added_at);
                            }
                            
                            return 0;
                        });
                        
                        return allAttachments.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {(showAllAttachments ? allAttachments : allAttachments.slice(0, 3)).map((attachment, index) => (
                                        <div key={`${attachment.fileName}-${index}`} className={`flex items-start justify-between gap-2 p-2 border rounded-md transition-all duration-500 ${
                                            attachment.type === 'uploading' 
                                                ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' 
                                                : attachment.type === 'transitioning'
                                                ? 'bg-green-50 border-green-200 hover:bg-green-100'
                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                        }`}>
                                            <div className="flex items-start gap-2 flex-1 min-w-0">
                                                <FileIcon fileName={attachment.fileName} className="w-3.5 h-3.5 text-gray-800 flex-shrink-0 mt-0.5" />
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className="text-xs text-gray-900 truncate font-semibold mb-0.5">
                                                        {attachment.type === 'uploading' ? (
                                                            <span className="text-yellow-800 font-semibold">
                                                                {attachment.fileName}
                                                            </span>
                                                        ) : attachment.type === 'transitioning' ? (
                                                            <span className="text-green-800 font-semibold">
                                                                {attachment.fileName}
                                                            </span>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <a
                                                                    href={attachment.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-gray-900 hover:text-blue-600 hover:underline font-semibold"
                                                                    title={attachment.fileName}
                                                                >
                                                                    {attachment.fileName}
                                                                </a>
                                                            </div>
                                                        )}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 font-medium">
                                                        {attachment.type === 'uploading' ? (
                                                            <span className="text-yellow-700 font-semibold">Uploading...</span>
                                                        ) : attachment.type === 'transitioning' ? (
                                                            <span className="text-green-700 font-semibold">Uploaded!</span>
                                                        ) : attachment.added_at && !isNaN(new Date(attachment.added_at).getTime()) ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-500 font-medium">
                                                                    {new Date(attachment.added_at).toLocaleString()}
                                                                </span>
                                                                {/* Show "Latest" badge for the most recent file */}
                                                                {index === 0 && attachment.type === 'existing' && (
                                                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[8px] font-extrabold rounded-full uppercase tracking-wider">
                                                                        Latest
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : ticket.updated_at && !isNaN(new Date(ticket.updated_at).getTime()) ? (
                                                            <span className="text-gray-500 font-medium">
                                                                {new Date(ticket.updated_at).toLocaleString()}
                                                            </span>
                                                        ) : ticket.created_at && !isNaN(new Date(ticket.created_at).getTime()) ? (
                                                            <span className="text-gray-500 font-medium">
                                                                {new Date(ticket.created_at).toLocaleString()}
                                                            </span>
                                                        ) : 'Date not available'}
                                                    </span>
                                                </div>
                                            </div>
                                            {attachment.type === 'uploading' ? (
                                                <div className="flex-shrink-0 flex items-center justify-center">
                                                    <div className="animate-spin h-4 w-4">
                                                        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            ) : attachment.type === 'transitioning' ? (
                                                <div className="flex-shrink-0 flex items-center justify-center">
                                                    <div className="text-green-600">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            ) : (
                                                <a
                                                    href={attachment.url}
                                                    download={attachment.fileName}
                                                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors duration-200 flex-shrink-0 flex items-center justify-center"
                                                    title="Download file"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Show More/Less button - positioned below the grid */}
                                {allAttachments.length > 3 && (
                                    <div className="mt-3 text-center">
                                        <button
                                            onClick={() => setShowAllAttachments(!showAllAttachments)}
                                            className="text-[10px] text-orange-600 hover:text-orange-800 hover:underline font-bold tracking-wide"
                                        >
                                            {showAllAttachments 
                                                ? 'Show Less' 
                                                : `Show More (${allAttachments.length - 3} older attachments)`
                                            }
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : null;
                    })()}
                </div>
            </div>
        </div>
    );
};

export default TicketDetailsSection; 