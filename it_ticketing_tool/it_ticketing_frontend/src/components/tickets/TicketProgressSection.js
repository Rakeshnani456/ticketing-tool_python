import React from 'react';
import { User, Calendar, Clock, Activity } from 'lucide-react';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import UserProfilePopup from '../common/UserProfilePopup';

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
            case 'Open': return 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border-blue-300 shadow-sm';
            case 'In Progress': return 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border-amber-300 shadow-sm';
            case 'Hold': return 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border-purple-300 shadow-sm';
            case 'Cancelled': return 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-300 shadow-sm';
            case 'Resolved': return 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 border-emerald-300 shadow-sm';
            default: return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-300 shadow-sm';
        }
    };

    const getPriorityClasses = (priority) => {
        switch (priority) {
            case 'Low': return 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 border-emerald-300 shadow-sm';
            case 'Medium': return 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border-amber-300 shadow-sm';
            case 'High': return 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 border-orange-300 shadow-sm';
            case 'Critical': return 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-300 shadow-sm';
            default: return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-300 shadow-sm';
        }
    };

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

                {/* Custom Edit/Save/Cancel buttons */}
                {canEdit && !isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-2 py-1 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-md shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ height: '24px', minHeight: '24px' }}
                    >
                        Edit
                    </button>
                )}
                {isEditing && canEdit && (
                    <div className="flex items-center space-x-1.5">
                        {/* Only show Cancel button if not saving */}
                        {saveButtonState === 'save' && (
                            <button
                                onClick={handleCancelEdit}
                                disabled={updateLoading}
                                className="px-2 py-1 text-xs font-semibold text-gray-600 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ height: '24px', minHeight: '24px' }}
                            >
                                Cancel
                            </button>
                        )}
                        {/* Save button always shown */}
                        <button
                            onClick={() => handleUpdateTicket('save')}
                            disabled={updateLoading || !hasChanges()}
                            className={`px-2 py-1 text-xs font-semibold text-white rounded-md shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                                saveButtonState === 'success' 
                                    ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:ring-green-300' 
                                    : saveButtonState === 'error' 
                                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-300'
                                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-300'
                            }`}
                            style={{ height: '24px', minHeight: '24px' }}
                        >
                            {saveButtonState === 'saving' && 'Saving...'}
                            {saveButtonState === 'success' && 'Saved!'}
                            {saveButtonState === 'error' && 'Error!'}
                            {saveButtonState === 'save' && 'Save'}
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-2 sm:space-y-2.5 w-full min-w-0 max-w-full overflow-x-hidden">
                {/* Status */}
                <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                    <label className="block text-xs font-bold mb-2">
                        Status:
                    </label>
                    {isEditing && canEdit && !isTicketClosedOrResolved ? (
                        <div className="flex flex-wrap gap-1.5 w-full min-w-0 max-w-full overflow-hidden mb-1 p-1">
                            {statuses.map(s => (
                                <button
                                    key={s.value}
                                    onClick={() => handleButtonSelection('status', s.value)}
                                    className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-semibold border transition-all duration-150 ease-in-out
                                    ${getStatusClasses(s.value)}
                                    ${editableFields.status === s.value
                                        ? 'border-2 border-blue-500 bg-blue-50'
                                        : 'hover:shadow-md hover:bg-opacity-80'
                                    }
                                    ${updateLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                                    `}
                                    disabled={updateLoading}
                                    title={s.label} // Tooltip for clarity
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <FieldBox isDisplayOnly={true} className="w-full min-w-0 max-w-full overflow-x-hidden">
                            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-semibold border ${getStatusClasses(ticket.status)}`}>
                                {ticket.status}
                            </span>
                        </FieldBox>
                    )}
                </div>

                {/* Priority */}
                <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                    <label className="block text-xs font-bold mb-2">
                        Priority:
                    </label>
                    {isEditing && canEdit ? (
                        <div className="flex flex-wrap gap-1.5 w-full min-w-0 max-w-full overflow-hidden mb-1 p-1">
                            {priorities.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => handleButtonSelection('priority', p.value)}
                                    className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-semibold border transition-all duration-150 ease-in-out
                                    ${getPriorityClasses(p.value)}
                                    ${editableFields.priority === p.value
                                        ? 'border-2 border-blue-500 bg-blue-50'
                                        : 'hover:shadow-md hover:bg-opacity-80'
                                    }
                                    ${updateLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                                    `}
                                    disabled={updateLoading}
                                    title={p.label} // Tooltip for clarity
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <FieldBox isDisplayOnly={true} className="w-full min-w-0 max-w-full overflow-x-hidden">
                            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[10px] font-semibold border ${getPriorityClasses(ticket.priority)}`}>
                                {ticket.priority}
                            </span>
                        </FieldBox>
                    )}
                </div>

                {/* Category */}
                <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                    <label className="block text-xs font-bold mb-1.5">
                        Category:
                    </label>
                    {isEditing && canEdit ? (
                        <Select
                            id="category"
                            value={editableFields.category || ''}
                            onChange={e => handleEditChange({ target: { id: 'category', value: e.target.value } })}
                            fullWidth
                            size="small"
                            displayEmpty
                            disabled={!canEdit}
                            sx={{
                                backgroundColor: 'white',
                                width: '100%',
                                height: '28px',
                                minHeight: '28px',
                                border: isEditing && canEdit ? '1.5px solid #60a5fa' : '1px solid #d1d5db',
                                borderRadius: 0,
                                px: 1.5,
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                boxSizing: 'border-box',
                                minWidth: 0,
                                maxWidth: '100%',
                                '& .MuiSelect-select': {
                                    height: '28px',
                                    minHeight: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    paddingTop: 0,
                                    paddingBottom: 0,
                                    paddingLeft: 0,
                                    paddingRight: '24px',
                                    minWidth: 0,
                                    maxWidth: '100%',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    border: 'none',
                                },
                                '& fieldset': {
                                    border: 'none',
                                },
                            }}
                            name="category"
                            renderValue={(selected) => selected ? selected.charAt(0).toUpperCase() + selected.slice(1) : 'Select Category'}
                            MenuProps={{
                                PaperProps: {
                                    style: {
                                        marginTop: 2,
                                        fontSize: '0.75rem',
                                    },
                                },
                            }}
                        >
                            <MenuItem value="" disabled sx={{ fontSize: '0.75rem' }}>Select Category</MenuItem>
                            <MenuItem value="software" sx={{ fontSize: '0.75rem' }}>Software</MenuItem>
                            <MenuItem value="hardware" sx={{ fontSize: '0.75rem' }}>Hardware</MenuItem>
                            <MenuItem value="troubleshoot" sx={{ fontSize: '0.75rem' }}>Troubleshoot</MenuItem>
                        </Select>
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
                        <div style={{ position: 'relative', width: '100%', minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                            <User className="w-3 h-3 text-gray-400" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 2 }} />
                            <Select
                                id="assigned_to_email"
                                value={editableFields.assigned_to_email || ''}
                                onChange={e => handleEditChange({ target: { id: 'assigned_to_email', value: e.target.value } })}
                                fullWidth
                                size="small"
                                displayEmpty
                                disabled={!canEdit || isTicketClosedOrResolved || supportUsersLoading}
                                sx={{
                                    backgroundColor: 'white',
                                    width: '100%',
                                    height: '28px',
                                    minHeight: '28px',
                                    border: isEditing && canEdit && !isTicketClosedOrResolved ? '1.5px solid #60a5fa' : '1px solid #d1d5db',
                                    borderRadius: 0,
                                    pl: 2.5,
                                    pr: 1.5,
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    boxSizing: 'border-box',
                                    minWidth: 0,
                                    maxWidth: '100%',
                                    '& .MuiSelect-select': {
                                        height: '28px',
                                        minHeight: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        paddingTop: 0,
                                        paddingBottom: 0,
                                        paddingLeft: 0,
                                        paddingRight: '24px',
                                        minWidth: 0,
                                        maxWidth: '100%',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        border: 'none',
                                    },
                                    '& fieldset': {
                                        border: 'none',
                                    },
                                }}
                                name="assigned_to_email"
                                renderValue={selected => {
                                    if (!selected) return 'Unassigned';
                                    const found = supportUsers.find(u => u.email === selected);
                                    const display = found ? (found.name ? `${found.name} (${found.email})` : found.email) : selected;
                                    return (
                                        <span style={{
                                            display: 'block',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            minWidth: 0,
                                            maxWidth: '100%'
                                        }} title={display}>{display}</span>
                                    );
                                }}
                                MenuProps={{
                                    PaperProps: {
                                        style: {
                                            marginTop: 2,
                                            fontSize: '0.75rem',
                                        },
                                    },
                                }}
                                inputProps={{ 'aria-label': 'Assigned To' }}
                            >
                                <MenuItem value="" sx={{ fontSize: '0.75rem' }}>Unassigned</MenuItem>
                                {supportUsers.map(u => (
                                    <MenuItem key={u.email} value={u.email} sx={{ fontSize: '0.75rem' }}>
                                        {u.name ? `${u.name} (${u.email})` : u.email}
                                    </MenuItem>
                                ))}
                                {/* If the current assigned_to_email is not in the list, show it as a disabled option */}
                                {editableFields.assigned_to_email &&
                                    !supportUsers.some(u => u.email === editableFields.assigned_to_email) && (
                                        <MenuItem value={editableFields.assigned_to_email} disabled>
                                            {editableFields.assigned_to_email} (not a support user)
                                        </MenuItem>
                                )}
                            </Select>
                                                            {assignedToErrorMessage && (
                                    <p className="text-xs mt-1">{assignedToErrorMessage}</p>
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