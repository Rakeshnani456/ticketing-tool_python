// src/components/common/KanbanView.js

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { createPortal } from 'react-dom';
import { 
  MoreVertical, 
  User, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  Circle,
  Pause,
  Eye,
  Calendar,
  UserPlus
} from 'lucide-react';
import CompactDropdown from './CompactDropdown';
import Spinner from './Spinner';

// Status configuration with colors and icons
const STATUS_CONFIG = {
  'Open': {
    label: 'Open',
    color: '#0052CC',
    bgColor: '#E9F2FF',
    borderColor: '#0052CC',
    icon: Circle,
    order: 1
  },
  'In Progress': {
    label: 'In Progress',
    color: '#FF991F',
    bgColor: '#FFF7E6',
    borderColor: '#FF991F',
    icon: Clock,
    order: 2
  },
  'Hold': {
    label: 'Hold',
    color: '#6554C0',
    bgColor: '#F3F0FF',
    borderColor: '#6554C0',
    icon: Pause,
    order: 3
  }
};

// Priority configuration
const PRIORITY_CONFIG = {
  'Critical': { color: '#DE350B', bgColor: '#FFEBE6', label: 'Critical' },
  'High': { color: '#FF5630', bgColor: '#FFEBE6', label: 'High' },
  'Medium': { color: '#FF991F', bgColor: '#FFF7E6', label: 'Medium' },
  'Low': { color: '#0065FF', bgColor: '#E9F2FF', label: 'Low' }
};

// Kanban Card Component
const KanbanCard = ({ 
  ticket, 
  onTicketClick, 
  onStatusChange, 
  onAssignmentChange,
  onPeek,
  user,
  availableEngineers = [],
  changingStatusTickets = new Set(),
  assigningTickets = new Set()
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [assignMenuPosition, setAssignMenuPosition] = useState({ top: 0, left: 0 });
  const actionsRef = useRef(null);
  const assignButtonRef = useRef(null);
  const assignMenuRef = useRef(null);

  // Close actions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideActions = actionsRef.current && !actionsRef.current.contains(event.target);
      const clickedOutsideAssignMenu = !assignMenuRef.current || !assignMenuRef.current.contains(event.target);
      
      if (clickedOutsideActions && clickedOutsideAssignMenu) {
        setShowActions(false);
        setShowAssignMenu(false);
      }
    };

    if (showActions || showAssignMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showActions, showAssignMenu]);

  // Calculate position for assign menu
  useEffect(() => {
    if (showAssignMenu && assignButtonRef.current) {
      const rect = assignButtonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const menuWidth = 192; // w-48 = 12rem = 192px
      
      let left = rect.right + 4; // 4px gap
      let top = rect.top;
      
      // If menu would go off right edge, position it to the left
      if (left + menuWidth > viewportWidth) {
        left = rect.left - menuWidth - 4;
      }
      
      setAssignMenuPosition({ top, left });
    }
  }, [showAssignMenu]);

  const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG['Low'];
  const isChangingStatus = changingStatusTickets.has(ticket.id);
  const isAssigning = assigningTickets.has(ticket.id);
  const [justAssigned, setJustAssigned] = useState(false);

  // Get assignee name from available engineers or use the stored name
  const getAssigneeName = () => {
    if (!ticket.assigned_to_email) return null;
    
    // First try to get from ticket data
    if (ticket.assigned_to_name) return ticket.assigned_to_name;
    
    // Then try to find in available engineers
    const engineer = availableEngineers.find(eng => eng.email === ticket.assigned_to_email);
    if (engineer) return engineer.name || engineer.email;
    
    // Fall back to email
    return ticket.assigned_to_email;
  };

  const assigneeName = getAssigneeName();

  // Animation when assignment changes
  useEffect(() => {
    if (isAssigning) {
      setJustAssigned(true);
      const timer = setTimeout(() => setJustAssigned(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isAssigning]);

  // Status options for dropdown
  const statusOptions = Object.keys(STATUS_CONFIG).map(status => ({
    value: status,
    label: status
  }));

  // Assignment options
  const assignmentOptions = [
    { value: 'unassigned', label: 'Unassigned' },
    ...availableEngineers.map(engineer => ({
      value: engineer.email,
      label: engineer.name || engineer.email
    }))
  ];

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      return 'N/A';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: justAssigned ? [1, 1.02, 1] : 1,
        boxShadow: justAssigned 
          ? ['0 1px 3px 0 rgba(0, 0, 0, 0.1)', '0 4px 12px 0 rgba(59, 130, 246, 0.3)', '0 1px 3px 0 rgba(0, 0, 0, 0.1)']
          : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        duration: 0.2,
        layout: { duration: 0.3, type: "spring", stiffness: 300, damping: 30 },
        scale: { duration: 0.5 },
        boxShadow: { duration: 0.5 }
      }}
      className="relative bg-white rounded border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer mb-2 group w-full min-w-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onTicketClick(ticket)}
      style={{
        borderLeft: `3px solid ${priorityConfig.color}`
      }}
    >
      {/* Card Content */}
      <div className="p-2.5 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-[11px] font-medium text-gray-500 shrink-0">
              {ticket.display_id}
            </span>
            <span 
              className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
              style={{ 
                backgroundColor: priorityConfig.bgColor,
                color: priorityConfig.color
              }}
            >
              {ticket.priority}
            </span>
          </div>
          
          {/* Actions Button */}
          <div className="relative shrink-0" ref={actionsRef}>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <MoreVertical size={14} className="text-gray-400" />
            </motion.button>

            {/* Actions Dropdown */}
            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 min-w-[180px] max-w-[240px] bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[9998]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPeek?.(ticket);
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-all duration-150 active:bg-blue-100"
                  >
                    <Eye size={12} className="shrink-0" />
                    <span className="font-medium">Quick View</span>
                  </button>
                  
                  {/* Assignment Submenu */}
                  <div className="relative">
                    <button
                      ref={assignButtonRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAssignMenu(!showAssignMenu);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-all duration-150 active:bg-blue-100 ${
                        showAssignMenu ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                    >
                      <UserPlus size={12} className="shrink-0" />
                      <span className="flex-1 truncate font-medium">Assign to</span>
                      <span className="text-[10px]">›</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-xs font-medium text-gray-900 mb-2 line-clamp-2 leading-tight break-words overflow-hidden">
          {ticket.short_description}
        </h4>

        {/* Footer */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <Calendar size={10} className="shrink-0 text-gray-400" />
            <span className="whitespace-nowrap font-normal">{formatDate(ticket.created_at)}</span>
          </div>
          
          {/* Assignee */}
          <div className="flex items-center gap-1 min-w-0">
            {assigneeName ? (
              <div className="flex items-center gap-1.5 min-w-0 w-full">
                <User size={11} className="shrink-0 text-gray-600" />
                <span className="shrink-0 text-gray-500 font-medium text-[10px]">Assigned:</span>
                <span className="truncate font-semibold text-[11px] text-gray-700 flex-1" title={assigneeName}>
                  {assigneeName}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <User size={11} className="shrink-0 text-gray-400" />
                <span className="text-gray-400 italic text-[10px] font-normal">Unassigned</span>
              </div>
            )}
          </div>
        </div>

        {/* Reporter (if different from assignee) */}
        {ticket.reporter_name && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] min-w-0 bg-gray-50 px-2 py-1 rounded border border-gray-100">
            <span className="shrink-0 text-gray-500 font-medium">Reporter:</span>
            <span className="truncate min-w-0 text-gray-700 font-semibold">{ticket.reporter_name}</span>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {(isChangingStatus || isAssigning) && (
        <div className="absolute inset-0 bg-white bg-opacity-75 rounded flex items-center justify-center">
          <Spinner size="md" />
        </div>
      )}

      {/* Assignment Menu Portal */}
      {showAssignMenu && createPortal(
        <motion.div
          ref={assignMenuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-h-60 overflow-y-auto z-[9999]"
          style={{
            top: `${assignMenuPosition.top}px`,
            left: `${assignMenuPosition.left}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAssignmentChange?.(ticket.id, null);
              setShowActions(false);
              setShowAssignMenu(false);
            }}
            className={`w-full px-3 py-1.5 text-left text-xs transition-all duration-150 flex items-center gap-2 ${
              !ticket.assigned_to_email 
                ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-500' 
                : 'hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100'
            }`}
          >
            {!ticket.assigned_to_email && <CheckCircle2 size={12} className="shrink-0" />}
            <span className={!ticket.assigned_to_email ? '' : 'italic text-gray-600'}>Unassigned</span>
          </button>
          {availableEngineers.map(engineer => {
            const isAssigned = ticket.assigned_to_email === engineer.email;
            return (
              <button
                key={engineer.email}
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignmentChange?.(ticket.id, engineer.email);
                  setShowActions(false);
                  setShowAssignMenu(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-xs transition-all duration-150 truncate flex items-center gap-2 ${
                  isAssigned
                    ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-500'
                    : 'hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100'
                }`}
              >
                {isAssigned && <CheckCircle2 size={12} className="shrink-0" />}
                <span>{engineer.name || engineer.email}</span>
              </button>
            );
          })}
        </motion.div>,
        document.body
      )}
    </motion.div>
  );
};

// Kanban Column Component
const KanbanColumn = ({ 
  status, 
  tickets, 
  onTicketClick,
  onStatusChange,
  onAssignmentChange,
  onPeek,
  user,
  availableEngineers,
  changingStatusTickets,
  assigningTickets,
  onDrop
}) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const ticketId = e.dataTransfer.getData('ticketId');
    const fromStatus = e.dataTransfer.getData('fromStatus');
    
    if (ticketId && fromStatus !== status) {
      onDrop(ticketId, status);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg min-w-0 overflow-hidden shadow-sm border border-gray-200">
      {/* Column Header */}
      <div 
        className="px-3 py-2.5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white rounded-t-lg flex-shrink-0"
        style={{ 
          borderTop: `3px solid ${config.color}`
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Icon size={14} className="flex-shrink-0" style={{ color: config.color }} />
            <h3 className="text-xs font-semibold text-gray-900 truncate">{config.label}</h3>
          </div>
          <motion.span 
            key={tickets.length}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
            className="text-[11px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ml-2"
            style={{ 
              backgroundColor: config.bgColor,
              color: config.color
            }}
          >
            {tickets.length}
          </motion.span>
        </div>
      </div>

      {/* Cards Container */}
      <div 
        className={`flex-1 overflow-y-auto overflow-x-hidden p-2 transition-all duration-200 ${
          isDragOver ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : 'bg-gray-50/30'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ 
          minHeight: '400px',
          height: '100%'
        }}
      >
        <AnimatePresence mode="popLayout">
          {tickets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-32 text-xs text-gray-400 italic"
            >
              No tickets
            </motion.div>
          ) : (
            tickets.map((ticket) => (
              <div
                key={ticket.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('ticketId', ticket.id);
                  e.dataTransfer.setData('fromStatus', status);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={(e) => {
                  e.target.style.opacity = '1';
                }}
                style={{ cursor: 'grab' }}
                onMouseDown={(e) => {
                  if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                    e.currentTarget.style.cursor = 'grabbing';
                  }
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.cursor = 'grab';
                }}
              >
                <KanbanCard
                  ticket={ticket}
                  onTicketClick={onTicketClick}
                  onStatusChange={onStatusChange}
                  onAssignmentChange={onAssignmentChange}
                  onPeek={onPeek}
                  user={user}
                  availableEngineers={availableEngineers}
                  changingStatusTickets={changingStatusTickets}
                  assigningTickets={assigningTickets}
                />
              </div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Main Kanban View Component
const KanbanView = ({
  tickets = [],
  onTicketClick,
  onStatusChange,
  onAssignmentChange,
  onPeek,
  user,
  loading = false,
  availableEngineers = [],
  changingStatusTickets = new Set(),
  assigningTickets = new Set()
}) => {
  // Group tickets by status
  const ticketsByStatus = useMemo(() => {
    const grouped = {};
    
    // Initialize all statuses
    Object.keys(STATUS_CONFIG).forEach(status => {
      grouped[status] = [];
    });

    // Group tickets
    tickets.forEach(ticket => {
      const status = ticket.status;
      if (grouped[status]) {
        grouped[status].push(ticket);
      }
    });

    return grouped;
  }, [tickets]);

  // Handle drag and drop status change
  const handleDrop = async (ticketId, newStatus) => {
    if (onStatusChange) {
      await onStatusChange(ticketId, newStatus);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <span className="text-sm text-gray-500">Loading kanban board...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm p-4 overflow-hidden">
      {/* Kanban Board */}
      <div 
        className="grid gap-3 w-full" 
        style={{ 
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          height: 'calc(100vh - 268px)',
          minHeight: '500px'
        }}
      >
        {Object.keys(STATUS_CONFIG)
          .sort((a, b) => STATUS_CONFIG[a].order - STATUS_CONFIG[b].order)
          .map(status => (
            <KanbanColumn
              key={status}
              status={status}
              tickets={ticketsByStatus[status]}
              onTicketClick={onTicketClick}
              onStatusChange={onStatusChange}
              onAssignmentChange={onAssignmentChange}
              onPeek={onPeek}
              user={user}
              availableEngineers={availableEngineers}
              changingStatusTickets={changingStatusTickets}
              assigningTickets={assigningTickets}
              onDrop={handleDrop}
            />
          ))}
      </div>

    </div>
  );
};

export default KanbanView;

