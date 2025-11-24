import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Edit, 
  Trash2,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Minus
} from 'lucide-react';
import { clsx } from 'clsx';
import Spinner from './Spinner';

// Modern status badge component
const StatusBadge = ({ status, size = 'sm' }) => {
  const getStatusConfig = (status) => {
    const configs = {
      'Open': { 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        icon: AlertCircle,
        iconColor: 'text-blue-500'
      },
      'In Progress': { 
        bg: 'bg-yellow-50', 
        text: 'text-yellow-700', 
        border: 'border-yellow-200',
        icon: Clock,
        iconColor: 'text-yellow-500'
      },
      'Hold': { 
        bg: 'bg-purple-50', 
        text: 'text-purple-700', 
        border: 'border-purple-200',
        icon: Minus,
        iconColor: 'text-purple-500'
      },
      'Cancelled': { 
        bg: 'bg-red-50', 
        text: 'text-red-700', 
        border: 'border-red-200',
        icon: XCircle,
        iconColor: 'text-red-500'
      }
    };
    return configs[status] || configs['Open'];
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';

  return (
    <div className={clsx(
      'inline-flex items-center gap-1 rounded-full border font-medium modern-badge',
      config.bg,
      config.text,
      config.border,
      sizeClasses
    )}>
      <Icon className={clsx('h-2.5 w-2.5', config.iconColor)} />
      {status}
    </div>
  );
};

// Modern priority badge component
const PriorityBadge = ({ priority, size = 'sm' }) => {
  const getPriorityConfig = (priority) => {
    const configs = {
      'Critical': { 
        bg: 'bg-red-50', 
        text: 'text-red-700', 
        border: 'border-red-200',
        icon: ArrowUp,
        iconColor: 'text-red-500'
      },
      'High': { 
        bg: 'bg-orange-50', 
        text: 'text-orange-700', 
        border: 'border-orange-200',
        icon: ArrowUp,
        iconColor: 'text-orange-500'
      },
      'Medium': { 
        bg: 'bg-yellow-50', 
        text: 'text-yellow-700', 
        border: 'border-yellow-200',
        icon: Minus,
        iconColor: 'text-yellow-500'
      },
      'Low': { 
        bg: 'bg-green-50', 
        text: 'text-green-700', 
        border: 'border-green-200',
        icon: ArrowDown,
        iconColor: 'text-green-500'
      }
    };
    return configs[priority] || configs['Medium'];
  };

  const config = getPriorityConfig(priority);
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';

  return (
    <div className={clsx(
      'inline-flex items-center gap-1 rounded-full border font-medium modern-badge',
      config.bg,
      config.text,
      config.border,
      sizeClasses
    )}>
      <Icon className={clsx('h-2.5 w-2.5', config.iconColor)} />
      {priority}
    </div>
  );
};

// Modern table cell component
const TableCell = ({ children, className, onClick, ...props }) => (
  <td 
    className={clsx(
      'px-3 py-4 text-sm text-gray-800 border-b border-r border-gray-200 modern-table-cell',
      'hover:bg-gray-50 transition-colors duration-150',
      onClick && 'cursor-pointer',
      className
    )}
    style={{ fontWeight: 500 }}
    onClick={onClick}
    {...props}
  >
    {children}
  </td>
);

// Modern table header component
const TableHeader = ({ children, className, sortable, sortDirection, onSort, tooltipAlign = 'right', ...props }) => (
  <th 
    className={clsx(
      'px-3 py-2 text-left text-sm text-gray-900 tracking-wider relative group',
      'border-b border-r border-gray-200 bg-gray-50',
      sortable && 'cursor-pointer hover:bg-gray-100 transition-colors duration-150',
      className
    )}
    style={{ fontWeight: 400 }}
    onClick={sortable ? onSort : undefined}
    {...props}
  >
    <div className="flex items-center pr-7" style={{ fontWeight: 400 }}>
      <span className="truncate" style={{ fontWeight: 400 }}>{children}</span>
    </div>
    {sortable && (
      <div className="absolute inset-y-0 right-2 flex flex-col items-center justify-center z-20">
        {/* Different kind of arrows based on state */}
        <div className="flex flex-col leading-none" aria-hidden>
          {sortDirection === 'asc' ? (
            <>
              <ArrowUp className="h-3 w-3 text-gray-900" />
              <ChevronDown className="h-3 w-3 -mt-1 text-gray-300" />
            </>
          ) : sortDirection === 'desc' ? (
            <>
              <ChevronUp className="h-3 w-3 text-gray-300" />
              <ArrowDown className="h-3 w-3 -mt-1 text-gray-900" />
            </>
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />
          )}
        </div>

        {/* Custom tooltip with arrow (rendered below) */}
        <div className={clsx(
          'pointer-events-none absolute top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity z-50',
          tooltipAlign === 'left' ? 'left-0' : 'right-0'
        )}>
          <div className={clsx(
            'relative px-2 py-1 rounded-md text-white text-[10px] whitespace-nowrap shadow',
            sortDirection === 'asc' ? 'bg-blue-600' : sortDirection === 'desc' ? 'bg-violet-600' : 'bg-gray-800'
          )}>
            {sortDirection === 'asc' ? 'Ascending • click for descending' : sortDirection === 'desc' ? 'Descending • click to reset/asc' : 'Click to sort ascending'}
            <div className={clsx(
              'absolute -top-1 w-2 h-2 rotate-45',
              tooltipAlign === 'left' ? 'left-2' : 'right-2',
              sortDirection === 'asc' ? 'bg-blue-600' : sortDirection === 'desc' ? 'bg-violet-600' : 'bg-gray-800'
            )} />
          </div>
        </div>
      </div>
    )}
  </th>
);

// Main modern grid component
const ModernTicketGrid = ({ 
  tickets = [], 
  onTicketClick, 
  onStatusChange, 
  onAssignmentChange,
  onPeek,
  user,
  loading = false,
  showCheckboxes = false,
  selectedTickets = [],
  onTicketSelect,
  assignMode = false,
  changingStatusTickets = new Set(),
  assigningTickets = new Set(),
  availableEngineers = [],
  engineersLoading = false,
  startIndex = 0 // Add startIndex prop for pagination support
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [hoveredRow, setHoveredRow] = useState(null);

  // Sort tickets based on current sort configuration
  const sortedTickets = useMemo(() => {
    if (!sortConfig.key) return tickets;

    return [...tickets].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle different data types
      if (sortConfig.key === 'created_at' || sortConfig.key === 'updated_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [tickets, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <div className="inline-flex items-center gap-2 text-gray-500">
            <Spinner size="sm" />
            Loading tickets...
          </div>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <div className="text-gray-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No tickets found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm modern-ticket-grid-container">
      <div 
        className="relative z-10 modern-ticket-grid-scroll"
        style={{ 
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch'
        }}
        onScroll={(e) => {
          // Add scrolling class when user scrolls to show scrollbar
          if (e.target.scrollLeft > 0 || e.target.scrollWidth > e.target.clientWidth) {
            e.target.classList.add('scrolling');
          }
        }}
        onMouseEnter={(e) => {
          // Check if content overflows and add scrolling class
          if (e.target.scrollWidth > e.target.clientWidth) {
            e.target.classList.add('scrolling');
          }
        }}
        onMouseLeave={(e) => {
          // Remove scrolling class when mouse leaves
          e.target.classList.remove('scrolling');
        }}
      >
        <table className="border-collapse" style={{ width: '100%', tableLayout: 'auto' }}>
          <thead>
            <tr>
              {showCheckboxes && (
                <TableHeader className="w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedTickets.length === tickets.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onTicketSelect?.(tickets.map(t => t.id));
                      } else {
                        onTicketSelect?.([]);
                      }
                    }}
                  />
                </TableHeader>
              )}
              <TableHeader sortable sortDirection={sortConfig.key === 'display_id' ? sortConfig.direction : null} onSort={() => handleSort('display_id')} tooltipAlign="left">
                Ticket ID
              </TableHeader>
              <TableHeader sortable sortDirection={sortConfig.key === 'short_description' ? sortConfig.direction : null} onSort={() => handleSort('short_description')}>
                Summary
              </TableHeader>
              <TableHeader sortable sortDirection={sortConfig.key === 'created_at' ? sortConfig.direction : null} onSort={() => handleSort('created_at')}>
                Created
              </TableHeader>
              <TableHeader sortable sortDirection={sortConfig.key === 'priority' ? sortConfig.direction : null} onSort={() => handleSort('priority')}>
                Priority
              </TableHeader>
              <TableHeader sortable sortDirection={sortConfig.key === 'status' ? sortConfig.direction : null} onSort={() => handleSort('status')}>
                Status
              </TableHeader>
              <TableHeader sortable sortDirection={sortConfig.key === 'reporter_email' ? sortConfig.direction : null} onSort={() => handleSort('reporter_email')}>
                Requested by
              </TableHeader>
              {(user?.role === 'super_admin' || user?.role === 'engineer' || user?.role === 'support') && (
                <TableHeader sortable sortDirection={sortConfig.key === 'client_name' ? sortConfig.direction : null} onSort={() => handleSort('client_name')}>
                  Client
                </TableHeader>
              )}
              <TableHeader sortable sortDirection={sortConfig.key === 'assigned_to' ? sortConfig.direction : null} onSort={() => handleSort('assigned_to')}>
                Assignee
              </TableHeader>
              <TableHeader sortable sortDirection={sortConfig.key === 'updated_at' ? sortConfig.direction : null} onSort={() => handleSort('updated_at')}>
                Last Updated
              </TableHeader>
            </tr>
          </thead>
          <tbody>
              {sortedTickets.map((ticket, index) => (
                <tr
                  key={ticket.id}
                  className={clsx(
                    'group hover:bg-gray-50 modern-grid-hover',
                    'border-b border-gray-200',
                    selectedTickets.includes(ticket.id) && 'bg-blue-50'
                  )}
                  onMouseEnter={() => setHoveredRow(ticket.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {showCheckboxes && (
                    <TableCell className="w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedTickets.includes(ticket.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onTicketSelect?.([...selectedTickets, ticket.id]);
                          } else {
                            onTicketSelect?.(selectedTickets.filter(id => id !== ticket.id));
                          }
                        }}
                      />
                    </TableCell>
                  )}
                  <TableCell 
                    className="ticket-id text-sm tracking-wide"
                    style={{ fontWeight: 500 }}
                  >
                    <a
                      href={`/tickets/${ticket.id}`}
                      className="text-blue-700 hover:text-blue-800 hover:underline cursor-pointer"
                      style={{ fontWeight: 500 }}
                      title="Open ticket details"
                      onClick={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                          // Allow default browser behavior to open in a new tab
                          return;
                        }
                        e.preventDefault();
                        e.stopPropagation();
                        onTicketClick?.(ticket);
                      }}
                    >
                      {ticket.display_id}
                    </a>
                  </TableCell>
                  <TableCell 
                    className="max-w-xs cursor-pointer"
                    onClick={() => onTicketClick?.(ticket)}
                  >
                    <div className="ticket-summary line-clamp-2 text-gray-900 hover:text-gray-950 text-sm leading-relaxed" style={{ fontWeight: 500 }}>
                      {ticket.short_description}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="ticket-meta text-sm text-gray-700" style={{ fontWeight: 500 }}>
                      {formatDate(ticket.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={ticket.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="ticket-meta truncate text-sm text-gray-800" style={{ fontWeight: 500 }}>{ticket.reporter_email || ticket.requested_by || 'N/A'}</span>
                    </div>
                  </TableCell>
                  {(user?.role === 'super_admin' || user?.role === 'engineer' || user?.role === 'support') && (
                    <TableCell>
                      <span className="ticket-meta text-sm text-gray-800" style={{ fontWeight: 500 }}>{ticket.client_name || ''}</span>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="ticket-meta truncate text-sm text-gray-800" style={{ fontWeight: 500 }}>{ticket.assigned_to_email || 'Unassigned'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="ticket-meta text-sm text-gray-700" style={{ fontWeight: 500 }}>
                      {formatDate(ticket.updated_at)}
                    </span>
                  </TableCell>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ModernTicketGrid;
