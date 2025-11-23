import React from 'react';
import { User, Calendar, Clock, AlertCircle, CheckCircle, Loader2, XCircle, Edit3, X, Save } from 'lucide-react';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import UserProfilePopup from '../common/UserProfilePopup';
import CustomDropdown from '../common/CustomDropdown';

const FieldBox = ({ children, className = "", isDisplayOnly = false, hasError = false }) => (
    <div className={`FieldBox border px-2 sm:px-3 py-1.5 sm:py-2 h-auto min-h-[36px] sm:h-9 flex items-center rounded-md shadow-sm transition-all duration-200
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
    popupHideTimeout,
    isHoldDisabled,
    user,
    attemptedHoldWithoutComment,
    fieldUpdateStates,
    handleFieldUpdate,
    onConfirmUpdate,
    updateModeLoading
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

    // Check if user can update (superadmin or support/engineer)
    const canUpdate = user?.role === 'super_admin' || user?.role === 'support';
    
    // Check if there are any pending changes
    const hasPendingChanges = React.useMemo(() => {
        if (!ticket || !canEdit) return false;
        return (
            editableFields.status !== (ticket.status || '') ||
            editableFields.priority !== (ticket.priority || '') ||
            editableFields.assigned_to_email !== (ticket.assigned_to_email || '') ||
            editableFields.category !== (ticket.category || '')
        );
    }, [ticket, editableFields, canEdit]);
    
    return (
        <div className="bg-white p-3 sm:p-4 h-fit w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto ticket-progress-section">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-3 gap-2 sm:gap-0 w-full min-w-0 max-w-full overflow-x-hidden">
                <div className="flex items-center">
                    <h3 className="text-xs sm:text-sm md:text-base font-medium tracking-wide uppercase text-gray-900" style={{ fontWeight: 500, color: '#111827' }}>
                        Workflow
                    </h3>
                </div>
                {/* Update and Cancel buttons - only visible when there are pending changes */}
                {canUpdate && !isTicketClosedOrResolved && hasPendingChanges && (
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 flex-wrap">
                        <button
                            onClick={onConfirmUpdate}
                            disabled={updateModeLoading}
                            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap min-w-0"
                            title="Confirm updates"
                        >
                            {updateModeLoading ? (
                                <>
                                    <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin flex-shrink-0" />
                                    <span className="hidden sm:inline">Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                                    <span className="truncate">Update</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            disabled={updateModeLoading}
                            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors duration-200 shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap min-w-0"
                            title="Cancel updates"
                        >
                            <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                            <span className="truncate">Cancel</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-2 sm:space-y-2.5 w-full min-w-0 max-w-full overflow-x-hidden">
                {/* Status */}
                <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                    <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2 tracking-tight" style={{ fontWeight: 500, color: '#111827' }}>
                        Status:
                    </label>
                    {canEdit && !isTicketClosedOrResolved ? (
                        <>
                            <div className="relative">
                                <CustomDropdown
                                    value={editableFields.status}
                                    onChange={(value) => { 
                                        handleFieldUpdate('status', value);
                                    }}
                                    options={statuses.map(s => ({
                                        ...s,
                                        disabled: user?.role === 'super_admin' && s.value === 'Hold' && isHoldDisabled
                                    }))}
                                    placeholder="Select status..."
                                    className="w-full"
                                    size="sm"
                                    focusStyle="gray"
                                    customDisplay={editableFields.status ? (
                                        <span className={`text-xs font-medium ${getStatusTextClass(editableFields.status)}`}>
                                            {editableFields.status}
                                        </span>
                                    ) : null}
                                />
                            </div>
                            {user?.role === 'super_admin' && attemptedHoldWithoutComment && (
                                <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 flex items-start gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <span><strong>Hold requires a comment.</strong> Please add a comment in the Comments section before placing this ticket on Hold.</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <FieldBox isDisplayOnly={true} className="w-full min-w-0 max-w-full overflow-x-hidden">
                            <div className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-xs font-medium border ${getStatusClasses(ticket.status)}`}>
                                {ticket.status}
                            </div>
                        </FieldBox>
                    )}
                </div>

                {/* Priority */}
                <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                    <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2 tracking-tight" style={{ fontWeight: 500, color: '#111827' }}>
                        Priority:
                    </label>
                    {canEdit ? (
                        <div className="relative">
                            <CustomDropdown
                                value={editableFields.priority}
                                onChange={(value) => { 
                                    handleFieldUpdate('priority', value);
                                }}
                                options={priorities}
                                placeholder="Select priority..."
                                className="w-full"
                                size="sm"
                                focusStyle="gray"
                                customDisplay={editableFields.priority ? (
                                    <span className={`text-xs font-medium ${getPriorityTextClass(editableFields.priority)}`}>
                                        {editableFields.priority}
                                    </span>
                                ) : null}
                            />
                        </div>
                    ) : (
                        <FieldBox isDisplayOnly={true} className="w-full min-w-0 max-w-full overflow-x-hidden">
                            <div className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-xs font-medium border ${getPriorityClasses(ticket.priority)}`}>
                                {ticket.priority}
                            </div>
                        </FieldBox>
                    )}
                </div>

                {/* Category */}
                <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                        <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-1.5 tracking-tight" style={{ fontWeight: 500, color: '#111827' }}>
                        Category:
                    </label>
                    {canEdit ? (
                        <CustomDropdown
                            value={editableFields.category || ''}
                            onChange={(value) => { 
                                handleFieldUpdate('category', value);
                            }}
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
                            <span className="text-xs sm:text-sm font-normal text-gray-800 truncate flex-1 min-w-0 max-w-full" style={{ fontWeight: 400, color: '#1f2937' }}>
                                {ticket.category || 'N/A'}
                            </span>
                        </FieldBox>
                    )}
                </div>

                {/* Assigned to */}
                <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                        <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-1.5 tracking-tight" style={{ fontWeight: 500, color: '#111827' }}>
                        Assigned to:
                    </label>
                    {canEdit && !isTicketClosedOrResolved ? (
                        <div className="w-full">
                            <div className="relative">
                                <CustomDropdown
                                    value={editableFields.assigned_to_email || ''}
                                    onChange={(value) => { 
                                        handleFieldUpdate('assigned_to_email', value);
                                    }}
                                    options={supportUsersLoading ? [
                                        { value: '', label: 'Loading users...', disabled: true }
                                    ] : supportUsers.map(u => ({
                                        value: u.email,
                                        label: u.name ? `${u.name} (${u.email})` : u.email
                                    }))}
                                    placeholder={supportUsersLoading ? "Loading users..." : supportUsers.length === 0 ? "No users available" : "Select Assignee"}
                                    className="w-full"
                                    disabled={!canEdit || isTicketClosedOrResolved}
                                    size="sm"
                                    focusStyle="gray"
                                />
                            </div>
                            {assignedToErrorMessage && (
                                <p className="text-xs mt-1 text-red-600">{assignedToErrorMessage}</p>
                            )}
                        </div>
                    ) : (
                        <FieldBox isDisplayOnly={true} className="w-full min-w-0 max-w-full overflow-x-hidden">
                            <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 mr-1 sm:mr-1.5 shrink-0" />
                            <span
                                className="text-xs sm:text-sm font-normal text-gray-800 truncate flex-1 min-w-0 max-w-full cursor-pointer hover:text-blue-600 transition-colors"
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
                                {ticket.assigned_to_email ? ticket.assigned_to_email : <span className="italic text-gray-500">Unassigned</span>}
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
                        <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-1.5 tracking-tight" style={{ fontWeight: 500, color: '#111827' }}>
                            Closed by:
                        </label>
                        <FieldBox className="w-full min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                            <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 mr-1 sm:mr-1.5 shrink-0" />
                            <span
                                className="text-xs sm:text-sm font-normal text-gray-800 truncate flex-1 min-w-0 max-w-full cursor-pointer hover:text-blue-600 transition-colors"
                                onMouseEnter={() => showProfilePopup({ email: (isEditing ? editableFields.closed_by_email : ticket.closed_by_email), fullName: null }, null)}
                                onMouseLeave={() => { cancelShowProfilePopup(); hidePopup(); }}
                            >
                                {(isEditing ? editableFields.status : ticket.status) === 'Resolved' ||
                                (isEditing ? editableFields.status : ticket.status) === 'Cancelled'
                                  ? (isEditing && editableFields.closed_by_email
                                      ? editableFields.closed_by_email
                                      : ticket.closed_by_email
                                          ? ticket.closed_by_email
                                          : <span className="italic text-gray-500">N/A</span>)
                                  : <span className="italic text-gray-500">N/A</span>}
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
                        <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-1.5 tracking-tight" style={{ fontWeight: 500, color: '#111827' }}>
                            Resolved Date:
                        </label>
                        <FieldBox className="w-full min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 mr-1 sm:mr-1.5 shrink-0" />
                            <span className="text-xs sm:text-sm font-normal text-gray-800 text-wrap overflow-hidden flex-1 min-w-0 max-w-full" style={{ fontWeight: 400, color: '#1f2937' }}>
                                {(isEditing && editableFields.resolved_at
                                    ? new Date(editableFields.resolved_at).toLocaleString()
                                    : ticket.resolved_at
                                        ? new Date(ticket.resolved_at).toLocaleString()
                                        : <span className="italic text-gray-500">N/A</span>)}
                            </span>
                        </FieldBox>
                    </div>
                )}

                {/* Time Spent - Only for Engineers and when status is Resolved or closing or already resolved/cancelled */}
                {(isSupportUser || canEdit) && (
                    <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                        <label className="text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-1.5 tracking-tight" style={{ fontWeight: 500, color: '#111827' }}>
                            Time Spent <span className="text-xs sm:text-sm font-normal text-gray-600">(minutes)</span>:
                        </label>
                        {(isEditing && (editableFields.status === 'Resolved' || editableFields.status === 'Cancelled')) || isTicketClosedOrResolved ? (
                            <>
                                <FieldBox hasError={timeSpentHasError} className={`w-full min-w-0 max-w-full overflow-x-hidden`}>
                                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 mr-1 sm:mr-1.5 shrink-0" />
                                    <input
                                        id="time_spent"
                                        type="text"
                                        value={timeSpent}
                                        onChange={handleTimeSpentChange}
                                        className="FieldBox border border-blue-300 px-2 py-1 min-h-[28px] flex items-center bg-white rounded w-full min-w-0 max-w-full text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                                        disabled={!canEdit || isTicketClosedOrResolved}
                                        placeholder="in minutes (e.g., 45)"
                                        style={{ minWidth: 0, maxWidth: '100%' }}
                                    />
                                    <span className="ml-1 sm:ml-1.5 text-xs sm:text-sm shrink-0">minutes</span>
                                </FieldBox>
                                {timeSpentErrorMessage && (
                                    <p className="text-sm mt-1">{timeSpentErrorMessage}</p>
                                )}
                            </>
                        ) : (
                            <FieldBox className="w-full min-w-0 max-w-full overflow-x-hidden" isDisplayOnly={true}>
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 mr-1 sm:mr-1.5 shrink-0" />
                                <span className="text-xs sm:text-sm font-normal text-gray-800 truncate flex-1 min-w-0 max-w-full" style={{ fontWeight: 400, color: '#1f2937' }}>
                                    {ticket.time_spent ? `${ticket.time_spent} minutes` : <span className="italic text-gray-500">N/A</span>}
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