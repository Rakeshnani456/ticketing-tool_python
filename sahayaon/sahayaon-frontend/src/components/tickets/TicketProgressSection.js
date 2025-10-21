import React from 'react';
import { User, Calendar, Clock, Activity } from 'lucide-react';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import UserProfilePopup from '../common/UserProfilePopup';
import CustomDropdown from '../common/CustomDropdown';

const FieldBox = ({ children, className = "", isDisplayOnly = false, hasError = false }) => (
    <div className={`FieldBox border px-3 py-1.5 h-8 flex items-center rounded-md shadow-sm transition-all duration-200
        ${isDisplayOnly ? 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 cursor-text border-gray-200 overflow-hidden' : 'bg-white border-gray-300 hover:border-blue-400'}
        ${hasError ? 'border-red-500 ring-2 ring-red-200 bg-red-50' : ''}
        ${className}`}>
        {children}
    </div>
);

const TicketProgressSection = ({
    ticket,
    isEditing,
    canEdit,
    isSupportUser,
    isTicketClosedOrResolved,
    editableFields,
    handleEditChange,
    handleButtonSelection,
    updateLoading,
    saveButtonState,
    hasChanges,
    handleUpdateTicket,
    handleCancelEdit,
    setIsEditing,
    supportUsers,
    supportUsersLoading,
    assignedToErrorMessage,
    timeSpent,
    timeSpentErrorMessage,
    timeSpentHasError,
    handleTimeSpentChange,
    profilePopup,
    showProfilePopup,
    cancelShowProfilePopup,
    hidePopup,
    popupHideTimeout
}) => {
    const priorities = [
        { value: 'Low', label: 'Low' },
        { value: 'Medium', label: 'Medium' },
        { value: 'High', label: 'High' },
        { value: 'Critical', label: 'Critical' },
    ];

    const statuses = [
        { value: 'Open', label: 'Open' },
        { value: 'In Progress', label: 'In Progress' },
        { value: 'Hold', label: 'On Hold' },
        { value: 'Resolved', label: 'Resolved' },
        { value: 'Cancelled', label: 'Cancelled' },
    ];

    const getStatusClasses = (status) => {
        switch (status) {
            case 'Open': return 'bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-300 shadow-sm status-open';
            case 'In Progress': return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300 shadow-sm status-inprogress';
            case 'Hold': return 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-300 shadow-sm status-hold';
            case 'Cancelled': return 'bg-gradient-to-r from-red-50 to-red-100 border-red-300 shadow-sm status-cancelled';
            case 'Resolved': return 'bg-gradient-to-r from-green-50 to-green-100 border-green-300 shadow-sm status-resolved';
            default: return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-300 shadow-sm';
        }
    };

    // Text-only classes for use inside dropdown button (no background)
    const getStatusTextClass = (status) => {
        switch (status) {
            case 'Open': return 'status-open';
            case 'In Progress': return 'status-inprogress';
            case 'Hold': return 'status-hold';
            case 'Cancelled': return 'status-cancelled';
            case 'Resolved': return 'status-resolved';
            default: return '';
        }
    };

    const getPriorityClasses = (priority) => {
        switch (priority) {
            case 'Low': return 'bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-300 shadow-sm priority-low';
            case 'Medium': return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300 shadow-sm priority-medium';
            case 'High': return 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300 shadow-sm priority-high';
            case 'Critical': return 'bg-gradient-to-r from-red-50 to-red-100 border-red-300 shadow-sm priority-critical';
            default: return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-300 shadow-sm';
        }
    };

    // Text-only classes for dropdown selected display (no background)
    const getPriorityTextClass = (priority) => {
        switch (priority) {
            case 'Low': return 'priority-low';
            case 'Medium': return 'priority-medium';
            case 'High': return 'priority-high';
            case 'Critical': return 'priority-critical';
            default: return '';
        }
    };

    // Debounced autosave
    const autosaveTimerRef = React.useRef(null);
    const triggerAutosave = React.useCallback(() => {
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = setTimeout(() => {
            handleUpdateTicket('save');
        }, 250);
    }, [handleUpdateTicket]);

    return (
        <div className="bg-white p-3 sm:p-4 h-fit w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto ticket-progress-section">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-3 gap-2 sm:gap-0 w-full min-w-0 max-w-full overflow-x-hidden">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-purple-600 to-purple-800 rounded-full"></div>
                    <h3 className="text-xs sm:text-sm font-bold flex items-center">
                        Workflow
                    </h3>
                    <Activity width={16} height={16} className="" />
                </div>
                {/* Controls removed – autosave on change */}
            </div>

            <div className="space-y-2 sm:space-y-2.5 w-full min-w-0 max-w-full overflow-x-hidden">
                {/* Status */}
                <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                    <label className="block text-xs font-bold mb-2">
                        Status:
                    </label>
                    {isEditing && canEdit && !isTicketClosedOrResolved ? (
                        <CustomDropdown
                            value={editableFields.status}
                            onChange={(value) => { handleButtonSelection('status', value); setTimeout(triggerAutosave, 0); }}
                            options={statuses}
                            placeholder="Select status..."
                            className="w-full"
                            size="sm"
                            disabled={false}
                            focusStyle="gray"
                            customDisplay={editableFields.status ? (
                                <span className={`text-[10px] font-semibold ${getStatusTextClass(editableFields.status)}`}>
                                    {editableFields.status}
                                </span>
                            ) : null}
                        />
                    ) : (
                        <FieldBox isDisplayOnly={true} className="w-full min-w-0 max-w-full overflow-x-hidden">
                            <div className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-semibold border ${getStatusClasses(ticket.status)}`}>
                                {ticket.status}
                            </div>
                        </FieldBox>
                    )}
                </div>

                {/* Priority */}
                <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                    <label className="block text-xs font-bold mb-2">
                        Priority:
                    </label>
                    {isEditing && canEdit ? (
                        <CustomDropdown
                            value={editableFields.priority}
                            onChange={(value) => { handleButtonSelection('priority', value); setTimeout(triggerAutosave, 0); }}
                            options={priorities}
                            placeholder="Select priority..."
                            className="w-full"
                            size="sm"
                            disabled={false}
                            focusStyle="gray"
                            customDisplay={editableFields.priority ? (
                                <span className={`text-[10px] font-semibold ${getPriorityTextClass(editableFields.priority)}`}>
                                    {editableFields.priority}
                                </span>
                            ) : null}
                        />
                    ) : (
                        <FieldBox isDisplayOnly={true} className="w-full min-w-0 max-w-full overflow-x-hidden">
                            <div className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-semibold border ${getPriorityClasses(ticket.priority)}`}>
                                {ticket.priority}
                            </div>
                        </FieldBox>
                    )}
                </div>

                {/* Category */}
                <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                    <label className="block text-xs font-bold mb-1.5">
                        Category:
                    </label>
                    {isEditing && canEdit ? (
                        <CustomDropdown
                            value={editableFields.category || ''}
                            onChange={(value) => { handleEditChange({ target: { id: 'category', value } }); setTimeout(triggerAutosave, 0); }}
                            options={[
                                { value: 'software', label: 'Software' },
                                { value: 'hardware', label: 'Hardware' },
                                { value: 'troubleshoot', label: 'Troubleshoot' }
                            ]}
                            placeholder="Select Category"
                            className="w-full"
                            disabled={!canEdit}
                            size="sm"
                            focusStyle="gray"
                        />
                    ) : (
                        <FieldBox isDisplayOnly={true} className="w-full min-w-0 max-w-full overflow-x-hidden">
                            <span className="text-xs truncate flex-1 min-w-0 max-w-full">
                                {ticket.category || 'N/A'}
                            </span>
                        </FieldBox>
                    )}
                </div>

                {/* Assigned to */}
                <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                    <label className="block text-xs font-bold mb-1.5">
                        Assigned to:
                    </label>
                    {isEditing && canEdit && !isTicketClosedOrResolved ? (
                        <div className="w-full">
                            <CustomDropdown
                                value={editableFields.assigned_to_email || ''}
                                onChange={(value) => { handleEditChange({ target: { id: 'assigned_to_email', value } }); setTimeout(triggerAutosave, 0); }}
                                options={[
                                    { value: '', label: 'Unassigned' },
                                    ...supportUsers.map(u => ({
                                        value: u.email,
                                        label: u.name ? `${u.name} (${u.email})` : u.email
                                    }))
                                ]}
                                placeholder="Select Assignee"
                                className="w-full"
                                disabled={!canEdit || isTicketClosedOrResolved || supportUsersLoading}
                                size="sm"
                                focusStyle="gray"
                            />
                            {assignedToErrorMessage && (
                                <p className="text-xs mt-1 text-red-600">{assignedToErrorMessage}</p>
                            )}
                        </div>
                    ) : (
                        <FieldBox isDisplayOnly={true} className="w-full min-w-0 max-w-full overflow-x-hidden">
                            <User className="w-3 h-3 text-gray-400 mr-1.5 shrink-0" />
                            <span
                                className="text-xs truncate flex-1 min-w-0 max-w-full cursor-pointer"
                                onMouseEnter={() => {
                                    if (ticket.assigned_to_email) {
                                        showProfilePopup({ email: ticket.assigned_to_email, fullName: ticket.assigned_to_name }, null);
                                    }
                                }}
                                onMouseLeave={() => {
                                    if (ticket.assigned_to_email) {
                                        cancelShowProfilePopup();
                                        hidePopup();
                                    }
                                }}
                            >
                                {ticket.assigned_to_email ? ticket.assigned_to_email : <span className="">Unassigned</span>}
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
                    )}
                </div>

                {/* Closed By (Always rendered for support, but only if resolved/cancelled) */}
                {isSupportUser && (
                    <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                        <label className="block text-xs font-bold mb-1.5">
                            Closed by:
                        </label>
                        <FieldBox className="w-full min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                            <User className="w-3 h-3 text-gray-400 mr-1.5 shrink-0" />
                            <span
                                className="text-xs truncate flex-1 min-w-0 max-w-full cursor-pointer"
                                onMouseEnter={() => showProfilePopup({ email: (isEditing ? editableFields.closed_by_email : ticket.closed_by_email), fullName: null }, null)}
                                onMouseLeave={() => { cancelShowProfilePopup(); hidePopup(); }}
                            >
                                {(isEditing ? editableFields.status : ticket.status) === 'Resolved' ||
                                (isEditing ? editableFields.status : ticket.status) === 'Cancelled'
                                  ? (isEditing && editableFields.closed_by_email
                                      ? editableFields.closed_by_email
                                      : ticket.closed_by_email
                                          ? ticket.closed_by_email
                                          : <span className="">N/A</span>)
                                  : <span className="">N/A</span>}
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
                )}

                {/* Resolved Date - Only show when ticket is resolved or cancelled */}
                {((isEditing ? editableFields.status : ticket.status) === 'Resolved' ||
                  (isEditing ? editableFields.status : ticket.status) === 'Cancelled') && (
                    <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                        <label className="block text-xs font-bold mb-1.5">
                            Resolved Date:
                        </label>
                        <FieldBox className="w-full min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                            <Calendar className="w-3 h-3 text-gray-400 mr-1.5 shrink-0" />
                            <span className="text-xs text-wrap overflow-hidden flex-1 min-w-0 max-w-full">
                                {(isEditing && editableFields.resolved_at
                                    ? new Date(editableFields.resolved_at).toLocaleString()
                                    : ticket.resolved_at
                                        ? new Date(ticket.resolved_at).toLocaleString()
                                        : <span className="">N/A</span>)}
                            </span>
                        </FieldBox>
                    </div>
                )}

                {/* Time Spent - Only for Engineers and when status is Resolved or closing or already resolved/cancelled */}
                {(isSupportUser || canEdit) && (
                    <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                        <label className="text-xs font-bold mb-1.5">
                            Time Spent <span className="text-xs font-normal">(minutes)</span>:
                        </label>
                        {(isEditing && (editableFields.status === 'Resolved' || editableFields.status === 'Cancelled')) || isTicketClosedOrResolved ? (
                            <>
                                <FieldBox hasError={timeSpentHasError} className={`w-full min-w-0 max-w-full overflow-x-hidden`}>
                                    <Clock className="w-3 h-3 text-gray-400 mr-1.5 shrink-0" />
                                    <input
                                        id="time_spent"
                                        type="text"
                                        value={timeSpent}
                                        onChange={handleTimeSpentChange}
                                        className="FieldBox border border-blue-300 px-2 py-1 min-h-[28px] flex items-center bg-white rounded w-full min-w-0 max-w-full text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                                        disabled={!canEdit || isTicketClosedOrResolved}
                                        placeholder="in minutes (e.g., 45)"
                                        style={{ minWidth: 0, maxWidth: '100%' }}
                                    />
                                    <span className="ml-1.5 text-xs shrink-0">minutes</span>
                                </FieldBox>
                                {timeSpentErrorMessage && (
                                    <p className="text-xs mt-1">{timeSpentErrorMessage}</p>
                                )}
                            </>
                        ) : (
                            <FieldBox className="w-full min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                                <Clock className="w-3 h-3 text-gray-400 mr-1.5 shrink-0" />
                                <span className="text-xs truncate flex-1 min-w-0 max-w-full">
                                    {ticket.time_spent ? `${ticket.time_spent} minutes` : <span className="">N/A</span>}
                                </span>
                            </FieldBox>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketProgressSection;