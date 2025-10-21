import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Edit3, 
  Save, 
  X, 
  Upload, 
  Download, 
  MessageSquare, 
  Paperclip,
  Calendar,
  User,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

function App() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');
  const [commentText, setCommentText] = useState('');

  // Mock ticket data
  const ticket = {
    id: 'RITM0010001',
    priority: 'Medium',
    requestedBy: 'john.doe@company.com',
    status: 'In Progress',
    requestFor: 'jane.smith@company.com',
    assignedTo: 'support.agent@company.com',
    created: '2024-01-15 09:30:00',
    closedBy: null,
    category: 'Software',
    closedDate: null,
    shortDescription: 'Request for new laptop setup with required software installations',
    longDescription: 'Employee needs a new laptop configured with standard business applications including Microsoft Office 365, Adobe Creative Suite, VPN client, and development tools. The laptop should be configured according to company security policies and joined to the domain.',
    attachments: [
      { name: 'laptop_specifications.pdf', url: '#' },
      { name: 'software_requirements.docx', url: '#' }
    ],
    comments: [
      {
        author: 'john.doe@company.com',
        timestamp: '2024-01-15 09:35:00',
        text: 'This is urgent as the employee starts next Monday.'
      },
      {
        author: 'support.agent@company.com',
        timestamp: '2024-01-15 10:15:00',
        text: 'Laptop has been ordered and will arrive tomorrow. Will begin configuration immediately.'
      }
    ]
  };

  const [editableFields, setEditableFields] = useState({
    priority: ticket.priority,
    status: ticket.status,
    assignedTo: ticket.assignedTo,
    shortDescription: ticket.shortDescription,
    longDescription: ticket.longDescription
  });

  const handleFieldChange = (field, value) => {
    setEditableFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Save logic here
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditableFields({
      priority: ticket.priority,
      status: ticket.status,
      assignedTo: ticket.assignedTo,
      shortDescription: ticket.shortDescription,
      longDescription: ticket.longDescription
    });
    setIsEditing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const FieldBox = ({ children, className = "" }) => (
    <div className={`bg-white border border-gray-300 rounded px-3 py-2 min-h-[40px] flex items-center ${className}`}>
      {children}
    </div>
  );

  const EditableSelect = ({ value, onChange, options, className = "" }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-white border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    >
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );

  const EditableInput = ({ value, onChange, className = "" }) => (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-white border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    />
  );

  const EditableTextarea = ({ value, onChange, rows = 3, className = "" }) => (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className={`w-full bg-white border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${className}`}
    />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{ticket.id}</h1>
              <p className="text-sm text-gray-500">Request Item</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            {/* Ticket Information Grid */}
            <div className="space-y-4 mb-8">
              {/* Row 1: Ticket ID and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ticket ID
                  </label>
                  <FieldBox>
                    <span className="text-gray-900 font-medium">{ticket.id}</span>
                  </FieldBox>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  {isEditing ? (
                    <EditableSelect
                      value={editableFields.priority}
                      onChange={(value) => handleFieldChange('priority', value)}
                      options={['Low', 'Medium', 'High', 'Critical']}
                    />
                  ) : (
                    <FieldBox>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </FieldBox>
                  )}
                </div>
              </div>

              {/* Row 2: Requested by and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requested by
                  </label>
                  <FieldBox>
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-900">{ticket.requestedBy}</span>
                  </FieldBox>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  {isEditing ? (
                    <EditableSelect
                      value={editableFields.status}
                      onChange={(value) => handleFieldChange('status', value)}
                      options={['Open', 'In Progress', 'Resolved', 'Closed']}
                    />
                  ) : (
                    <FieldBox>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </FieldBox>
                  )}
                </div>
              </div>

              {/* Row 3: Request for and Assigned to */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Request for
                  </label>
                  <FieldBox>
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-900">{ticket.requestFor}</span>
                  </FieldBox>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned to
                  </label>
                  {isEditing ? (
                    <EditableInput
                      value={editableFields.assignedTo}
                      onChange={(value) => handleFieldChange('assignedTo', value)}
                    />
                  ) : (
                    <FieldBox>
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{ticket.assignedTo}</span>
                    </FieldBox>
                  )}
                </div>
              </div>

              {/* Row 4: Created and Closed by */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Created
                  </label>
                  <FieldBox>
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-900">{ticket.created}</span>
                  </FieldBox>
                </div>
                {ticket.closedBy && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Closed by
                    </label>
                    <FieldBox>
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{ticket.closedBy}</span>
                    </FieldBox>
                  </div>
                )}
              </div>

              {/* Row 5: Category and Closed date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <FieldBox>
                    <span className="text-gray-900">{ticket.category}</span>
                  </FieldBox>
                </div>
                {ticket.closedDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Closed date
                    </label>
                    <FieldBox>
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{ticket.closedDate}</span>
                    </FieldBox>
                  </div>
                )}
              </div>
            </div>

            {/* Short Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Short description
              </label>
              {isEditing ? (
                <EditableTextarea
                  value={editableFields.shortDescription}
                  onChange={(value) => handleFieldChange('shortDescription', value)}
                  rows={2}
                />
              ) : (
                <FieldBox className="min-h-[60px] items-start py-3">
                  <span className="text-gray-900">{ticket.shortDescription}</span>
                </FieldBox>
              )}
            </div>

            {/* Long Description */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Long description
              </label>
              {isEditing ? (
                <EditableTextarea
                  value={editableFields.longDescription}
                  onChange={(value) => handleFieldChange('longDescription', value)}
                  rows={6}
                />
              ) : (
                <FieldBox className="min-h-[120px] items-start py-3">
                  <span className="text-gray-900 whitespace-pre-wrap">{ticket.longDescription}</span>
                </FieldBox>
              )}
            </div>

            {/* Attachments */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Paperclip className="w-5 h-5 mr-2" />
                  Attachments
                </h3>
                <button className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ticket.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    <Download className="w-4 h-4 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700 truncate flex-1">{attachment.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Updates Section */}
            <div>
              <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'comments'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Comments
                  </button>
                  <button
                    onClick={() => setActiveTab('closure')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'closure'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 inline mr-2" />
                    Closure
                  </button>
                </nav>
              </div>

              {activeTab === 'comments' && (
                <div>
                  {/* Comments List */}
                  <div className="space-y-4 mb-6">
                    {ticket.comments.map((comment, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{comment.author}</span>
                          <span className="text-sm text-gray-500">{comment.timestamp}</span>
                        </div>
                        <p className="text-gray-700">{comment.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add a comment
                    </label>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Type your comment here..."
                    />
                    <div className="flex justify-end mt-3">
                      <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <MessageSquare className="w-4 h-4" />
                        <span>Add Comment</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'closure' && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Closure notes
                  </label>
                  <textarea
                    rows={6}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter closure notes here..."
                  />
                  <div className="flex justify-end mt-3">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Close Ticket</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;