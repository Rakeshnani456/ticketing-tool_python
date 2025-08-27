// src/components/tickets/TicketDetailsSection.js

import React from 'react';
import { User, Calendar, Info, Paperclip, Download, MessageSquare } from 'lucide-react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import UserProfilePopup from '../common/UserProfilePopup';

// Import file icons
import PdfIcon from '../../assets/icons/PdfIcon.svg';
import DocIcon from '../../assets/icons/DocIcon.svg';
import JpgIcon from '../../assets/icons/JpgIcon.svg';
import PngIcon from '../../assets/icons/PngIcon.svg';
import TxtIcon from '../../assets/icons/TxtIcon.svg';
import GenericFileIcon from '../../assets/icons/FileIcon.svg';

const FieldBox = ({ children, className = "", isDisplayOnly = false, hasError = false }) => (
    <div className={`FieldBox border px-3 py-1.5 h-8 flex items-center rounded-md transition-all duration-200
        ${isDisplayOnly ? 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 cursor-text border-gray-200 overflow-hidden' : 'bg-white border-gray-300 hover:border-blue-400'}
        ${hasError ? 'border-red-500 ring-2 ring-red-200 bg-red-50' : ''}
        ${className}`}>
        {children}
    </div>
);

const EditableTextarea = ({ id, value, onChange, rows = 3, className = "", disabled, hasError = false, inputRef, maxLength }) => (
    <textarea
        id={id}
        value={value}
        onChange={onChange}
        rows={rows}
        ref={inputRef}
        className={`border-2 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none flex-shrink-0 w-full transition-all duration-200 text-xs
            ${disabled ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300 cursor-not-allowed text-gray-600' : 'bg-white border-gray-300 hover:border-blue-400'}
            ${hasError ? 'border-red-500 ring-2 ring-red-200 bg-red-50' : ''}
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
    const handleCommentsClick = () => {
        const commentsSection = document.getElementById('comments-section');
        if (commentsSection) commentsSection.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAttachmentsClick = () => {
        const attachmentsSection = document.getElementById('attachments-section');
        if (attachmentsSection) attachmentsSection.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="bg-white p-3 sm:p-4 w-full min-w-0 max-w-full overflow-x-hidden">
            <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
                    <span className="text-xs sm:text-sm font-bold">Ticket Details</span>
                    <Info className="w-4 h-4 ml-1" />
                </div>
                
                {/* Comments and Attachments Count Tags */}
                {ticket && (
                    <div className="flex items-center gap-1 sm:gap-2 text-[10px]">
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
                        <label className="text-xs font-bold text-gray-700 w-full sm:w-20 lg:w-24 shrink-0">Ticket ID:</label>
                        <FieldBox className="w-full flex-1 min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                            <span className="text-xs font-medium text-blue-700 truncate flex-1 min-w-0 max-w-full">{ticket.display_id}</span>
                        </FieldBox>
                    </div>
                    {/* Requested by */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                                                    <label className="text-xs font-bold w-full sm:w-20 lg:w-24 shrink-0">Requested by:</label>
                                                    <FieldBox className="w-full flex-1 min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                            <span
                                className="text-xs font-medium truncate flex-1 min-w-0 max-w-full cursor-pointer transition-colors"
                                onMouseEnter={() => showProfilePopup({ email: ticket.reporter_email, fullName: ticket.reporter_name }, null)}
                                onMouseLeave={() => { cancelShowProfilePopup(); hidePopup(); }}
                            >
                                {ticket.reporter_email ? ticket.reporter_email : <span className="italic">Not specified</span>}
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
                        <label className="text-xs font-bold w-full sm:w-20 lg:w-24 shrink-0">Asset ID:</label>
                        <FieldBox className="w-full flex-1 min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                            <span className="text-xs font-medium truncate flex-1 min-w-0 max-w-full">{ticket.hostname_asset_id ? ticket.hostname_asset_id : <span className="italic">Not specified</span>}</span>
                        </FieldBox>
                    </div>
                </div>
                
                {/* Right column */}
                <div className="flex flex-col gap-1.5 sm:gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                    {/* Requested for */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                                                    <label className="text-xs font-bold w-full sm:w-20 lg:w-24 shrink-0">Requested for:</label>
                                                    <FieldBox className="w-full flex-1 min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                            <span
                                className="text-xs font-medium truncate flex-1 min-w-0 max-w-full cursor-pointer transition-colors"
                                onMouseEnter={() => showProfilePopup({ email: ticket.request_for_email, fullName: ticket.request_for_name }, null)}
                                onMouseLeave={() => { cancelShowProfilePopup(); hidePopup(); }}
                            >
                                {ticket.request_for_email ? ticket.request_for_email : <span className="italic">Not specified</span>}
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
                        <label className="text-xs font-bold w-full sm:w-20 lg:w-24 shrink-0">Contact No:</label>
                        <FieldBox className="w-full flex-1 min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                            <span className="text-xs font-medium truncate flex-1 min-w-0 max-w-full">{ticket.contact_number ? ticket.contact_number : <span className="italic">Not specified</span>}</span>
                        </FieldBox>
                    </div>
                    {/* Created */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
                                                    <label className="text-xs font-bold w-full sm:w-20 lg:w-24 shrink-0">Created:</label>
                            <FieldBox className="w-full flex-1 min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                                <Calendar className="w-3 h-3 mr-1.5 shrink-0" />
                                <span className="text-xs font-medium truncate flex-1 min-w-0 max-w-full">{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : <span className="italic">Not specified</span>}</span>
                        </FieldBox>
                    </div>
                </div>
            </div>

            {/* Long Description */}
            <div className="mb-3 sm:mb-4 mt-3 sm:mt-4 w-full min-w-0 max-w-full overflow-x-hidden">
                <label className="block text-xs font-bold mb-2">
                    Description:
                </label>
                <div className="border border-gray-200 px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-md w-full min-w-0 max-w-full overflow-y-auto" style={{ height: '200px' }}>
                    {isEditing && canEdit && (!ticket.long_description || ticket.long_description.trim() === '') ? (
                        <>
                            <EditableTextarea
                                id="long_description"
                                value={editableFields.long_description}
                                onChange={handleEditChange}
                                rows={10}
                                disabled={!canEdit}
                                className="w-full min-w-0 max-w-full text-xs bg-transparent border-none focus:outline-none resize-none"
                                style={{ height: '180px', lineHeight: '1.4', wordWrap: 'break-word', overflowWrap: 'break-word', fontFamily: 'inherit' }}
                                maxLength={1200}
                            />
                            <div className="text-xs text-gray-500 mt-2 text-right w-full font-medium">{editableFields.long_description.length}/1200 characters</div>
                        </>
                    ) : (
                        <>
                            {ticket.long_description ? (
                                <span className="text-xs whitespace-pre-wrap break-words w-full min-w-0 max-w-full" style={{ lineHeight: '1.4', wordWrap: 'break-word', overflowWrap: 'break-word', fontFamily: 'inherit' }}>
                                    {ticket.long_description}
                                </span>
                            ) : (
                                <span className="text-gray-500 text-[10px] col-span-full text-left py-2 font-medium" style={{ lineHeight: '1.4', wordWrap: 'break-word', overflowWrap: 'break-word', fontFamily: 'inherit' }}>No description provided.
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Attachments section */}
            <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center mb-2 sm:mb-3 justify-between gap-2 sm:gap-0 w-full min-w-0 max-w-full overflow-x-hidden">
                    <div className="flex items-center gap-2 py-1">
                        <div className="w-1 h-5 bg-gradient-to-b from-green-600 to-green-800 rounded-full"></div>
                        <h3 className="text-xs font-bold text-gray-800 flex items-center">
                            Attachments
                        </h3>
                        {canAddAttachments && (
                            <button
                                type="button"
                                onClick={() => {
                                    const input = document.getElementById('attachment-upload-btn');
                                    if (input) input.click();
                                }}
                                className="p-2 rounded-md hover:bg-green-50 text-green-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-2"
                                title="Upload attachments"
                            >
                                <Paperclip className="w-4 h-4 text-green-600" />
                            </button>
                        )}
                        {!canAddAttachments && (
                            <Paperclip className="w-4 h-4 text-green-600 ml-1" />
                        )}
                    </div>
                    <input
                        id="attachment-upload-btn"
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        hidden
                        disabled={!canAddAttachments}
                        value=""
                    />
                </div>
                <div id="attachments-section" className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-x-1 gap-y-1.5 w-full min-w-0 max-w-full overflow-x-hidden">
                    {uploadingFiles.map((fileObj, idx) => (
                        <div key={fileObj.file.name} className="relative w-full h-16 sm:h-18 flex flex-col items-center justify-start text-center group overflow-hidden bg-white rounded-md border border-gray-200 hover:shadow-md transition-all duration-200 min-w-0">
                            {/* Content container */}
                            <div className="relative z-10 flex flex-col items-center justify-center h-full w-full p-1 min-w-0">
                                {/* Thumbnail container with progress overlay */}
                                <div className="relative">
                                    {fileObj.isImage ? (
                                        <div className="relative">
                                            {/* Blurred background image */}
                                            <img 
                                                src={fileObj.previewUrl} 
                                                alt={fileObj.file.name} 
                                                className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded shadow-sm blur-sm opacity-60" 
                                            />
                                            {/* Progress overlay on thumbnail */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <CircularProgressbar
                                                    value={uploadProgress[fileObj.file.name] || 0}
                                                    text={`${uploadProgress[fileObj.file.name] || 0}%`}
                                                    styles={buildStyles({ 
                                                        pathColor: '#059669', 
                                                        textColor: '#059669', 
                                                        trailColor: '#e5e7eb', 
                                                        textSize: '8px',
                                                        backgroundColor: 'transparent'
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            {/* Blurred file icon background */}
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gray-100 rounded opacity-60">
                                                <FileIcon fileName={fileObj.file.name} className="w-5 h-5 sm:w-6 sm:h-6 opacity-70 blur-sm" />
                                            </div>
                                            {/* Progress overlay on file icon */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <CircularProgressbar
                                                    value={uploadProgress[fileObj.file.name] || 0}
                                                    text={`${uploadProgress[fileObj.file.name] || 0}%`}
                                                    styles={buildStyles({ 
                                                        pathColor: '#059669', 
                                                        textColor: '#059669', 
                                                        trailColor: '#e5e7eb', 
                                                        textSize: '8px',
                                                        backgroundColor: 'transparent'
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] sm:text-[9px] mt-0.5 truncate w-full px-0.5 font-medium leading-tight min-w-0">
                                    {fileObj.file.name}
                                </span>
                            </div>
                        </div>
                    ))}
                    {/* Existing attachments */}
                    {ticket.attachments && ticket.attachments.length > 0 ? (
                        ticket.attachments.map((attachment, index) => {
                            const isImage = attachment.fileName && /\.(jpg|jpeg|png)$/i.test(attachment.fileName);
                            return (
                                <a
                                    key={index}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={attachment.fileName}
                                    className="flex flex-col items-center justify-start transition-all duration-200 text-center group w-full h-16 sm:h-18 overflow-hidden relative bg-white rounded-md border border-gray-200 hover:shadow-lg hover:border-green-300 min-w-0"
                                    title={attachment.fileName}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-200">
                                        {isImage ? (
                                            <img src={attachment.url} alt={attachment.fileName} className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded shadow-sm" />
                                        ) : (
                                            <FileIcon fileName={attachment.fileName} className="w-8 h-8 sm:w-10 sm:h-10" />
                                        )}
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <Download className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-0.5">
                                        <span className="text-[8px] sm:text-[9px] text-gray-700 font-medium leading-tight truncate block w-full px-0.5 min-w-0">
                                            {attachment.fileName}
                                        </span>
                                    </div>
                                </a>
                            );
                        })
                    ) : (
                        <p className="text-gray-500 text-[10px] col-span-full text-left py-2 font-medium">No attachments yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TicketDetailsSection; 