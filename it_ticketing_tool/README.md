# IT Ticketing Tool

A comprehensive IT ticketing system built with React frontend and Node.js backend, featuring Firebase integration, real-time notifications, advanced analytics, and comprehensive user management capabilities.

## 🏗️ Project Architecture

### Overview
The IT Ticketing Tool is a full-stack web application designed to streamline IT support operations. It follows a modern client-server architecture with the following key components:

- **Frontend**: React.js application with Material-UI and Tailwind CSS
- **Backend**: Node.js/Express.js REST API
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Authentication
- **File Storage**: Firebase Storage
- **Email Service**: Nodemailer with Office365 SMTP
- **Real-time Communication**: WebSocket support with real-time analytics
- **Advanced Analytics**: Real-time dashboard with comprehensive reporting

### Technology Stack

#### Frontend Technologies
- **React 19.1.0** - UI framework
- **Material-UI 7.2.0** - Component library
- **Tailwind CSS** - Utility-first CSS framework
- **React Router DOM 6.30.1** - Client-side routing
- **Firebase 11.9.1** - Authentication and real-time features
- **Formik 2.4.6** - Form management
- **React Hook Form 7.61.0** - Form handling
- **Yup 1.6.1** - Form validation
- **Recharts 3.0.0** - Data visualization
- **AG Grid 34.0.0** - Advanced data grid
- **Framer Motion 12.19.1** - Animations
- **Ant Design** - Additional UI components
- **TanStack React Table** - Advanced table functionality

#### Backend Technologies
- **Node.js** - Runtime environment
- **Express.js 5.1.0** - Web framework
- **Firebase Admin SDK 13.4.0** - Server-side Firebase integration
- **Nodemailer 7.0.3** - Email functionality
- **CORS 2.8.5** - Cross-origin resource sharing
- **Busboy 1.6.0** - File upload handling
- **WebSocket 8.18.3** - Real-time communication
- **UUID** - Unique identifier generation

## 📁 File Hierarchy Structure

```
ticketing-tool_python/
├── it_ticketing_tool/
│   ├── it_ticketing_frontend/          # React Frontend Application
│   │   ├── public/                     # Static assets
│   │   │   ├── index.html             # Main HTML template
│   │   │   ├── favicon.ico            # App icon
│   │   │   └── manifest.json          # PWA manifest
│   │   ├── src/                       # Source code
│   │   │   ├── components/            # React components
│   │   │   │   ├── admin/             # Admin-specific components
│   │   │   │   │   ├── AdminManagementComponent.js
│   │   │   │   │   ├── ClientManagementComponent.js
│   │   │   │   │   ├── EngineerManagementComponent.js
│   │   │   │   │   ├── UserManagementComponent.js
│   │   │   │   │   ├── UserManagementComponent.css
│   │   │   │   │   └── ClientCard.js
│   │   │   │   ├── auth/              # Authentication components
│   │   │   │   │   ├── LoginComponent.js
│   │   │   │   │   ├── RegisterComponent.js
│   │   │   │   │   └── InitialPasswordChangeComponent.js
│   │   │   │   ├── tickets/           # Ticket-related components
│   │   │   │   │   ├── AllTicketsComponent.js
│   │   │   │   │   ├── CreateTicketComponent.js
│   │   │   │   │   ├── MyTicketsComponent.js
│   │   │   │   │   ├── TicketDetailComponent.js
│   │   │   │   │   ├── TicketTimelineComponent.js
│   │   │   │   │   └── Timeline.js
│   │   │   │   ├── common/            # Shared components
│   │   │   │   │   ├── Header.js
│   │   │   │   │   ├── Sidebar.js
│   │   │   │   │   ├── LoadingSpinner.js
│   │   │   │   │   ├── ErrorBoundary.js
│   │   │   │   │   ├── Modal.js
│   │   │   │   │   ├── Table.js
│   │   │   │   │   ├── Form.js
│   │   │   │   │   ├── Button.js
│   │   │   │   │   ├── Input.js
│   │   │   │   │   ├── Select.js
│   │   │   │   │   ├── DatePicker.js
│   │   │   │   │   ├── FileUpload.js
│   │   │   │   │   ├── NotificationModal.js
│   │   │   │   │   ├── BellRing.js
│   │   │   │   │   ├── ClientInfoModal.js
│   │   │   │   │   └── PrimaryButton.js
│   │   │   │   ├── DashboardComponent.js
│   │   │   │   ├── ProfileComponent.js
│   │   │   │   ├── SettingsComponent.js
│   │   │   │   ├── ReportsComponent.js
│   │   │   │   ├── ChangePasswordComponent.js
│   │   │   │   └── AccessDeniedComponent.js
│   │   │   ├── config/                # Configuration files
│   │   │   │   ├── firebase.js        # Firebase configuration
│   │   │   │   └── constants.js       # Application constants
│   │   │   ├── contexts/              # React contexts
│   │   │   │   └── ThemeContext.js    # Theme management
│   │   │   ├── hooks/                 # Custom React hooks
│   │   │   │   └── useRealTimeAnalytics.js # Real-time analytics hook
│   │   │   ├── utils/                 # Utility functions
│   │   │   │   ├── utils.js           # Helper functions
│   │   │   │   ├── websocketClient.js # WebSocket client
│   │   │   │   └── firebaseOptimizer.js # Firebase optimization
│   │   │   ├── assets/                # Static assets
│   │   │   │   ├── icons/             # SVG icons
│   │   │   │   └── logo/              # Logo images
│   │   │   ├── App.js                 # Main application component
│   │   │   ├── index.js               # Application entry point
│   │   │   └── index.css              # Global styles
│   │   ├── package.json               # Frontend dependencies
│   │   ├── tailwind.config.js         # Tailwind CSS configuration
│   │   ├── firebase.json              # Firebase hosting configuration
│   │   ├── .firebaserc                # Firebase project configuration
│   │   └── README.md                  # Frontend documentation
│   │
│   └── ticketing_tool_backend/        # Node.js Backend Application
│       ├── routes/                    # API route handlers
│       │   ├── authRoutes.js          # Authentication endpoints
│       │   ├── ticketRoutes.js        # Ticket management endpoints
│       │   ├── userManagementRoutes.js # User management endpoints
│       │   ├── adminRoutes.js         # Admin-specific endpoints
│       │   ├── adminManagement.js     # Admin management endpoints
│       │   ├── clientRoutes.js        # Client management endpoints
│       │   ├── dashboardRoutes.js     # Dashboard data endpoints
│       │   ├── notificationRoutes.js  # Notification endpoints
│       │   ├── attachmentRoutes.js    # File attachment endpoints
│       │   └── analyticsRoutes.js     # Analytics and reporting endpoints
│       ├── middleware/                # Express middleware
│       │   └── (authentication, validation, etc.)
│       ├── helpers/                   # Helper functions
│       │   └── (utility functions, database helpers)
│       ├── config/                    # Configuration files
│       │   ├── logging.js             # Logging configuration
│       │   └── (database config, environment variables)
│       ├── utils/                     # Utility functions
│       │   ├── activityLogger.js      # Activity logging
│       │   ├── cacheManager.js        # Cache management
│       │   ├── emailService.js        # Email service
│       │   └── emailTemplates.js      # Email templates
│       ├── server.js                  # Main server file
│       ├── websocketServer.js         # WebSocket server
│       ├── package.json               # Backend dependencies
│       ├── firebase.json              # Firebase functions configuration
│       ├── .firebaserc                # Firebase project configuration
│       ├── firebaserules.txt          # Firestore security rules
│       ├── docker-compose.yml         # Docker configuration
│       └── Dockerfile                 # Docker setup
│
├── config/                            # Global configuration
├── helpers/                           # Global helper functions
├── middleware/                        # Global middleware
├── routes/                            # Global routes
├── static/                            # Static files
├── templates/                         # HTML templates
├── venv/                              # Python virtual environment
├── requirements.txt                   # Python dependencies
├── package.json                       # Root package.json
└── README.md                          # Project documentation
```

## 🔧 Core Features

### 🎫 Ticket Management System
1. **Comprehensive Ticket Operations**
   - Create, view, edit, and delete tickets
   - Advanced ticket status tracking (Open, In Progress, Resolved, Closed)
   - Priority management (Low, Medium, High, Critical)
   - Category classification and organization
   - Asset ID tracking and management
   - Due date assignment and monitoring

2. **Advanced Ticket Features**
   - File attachments with drag-and-drop support
   - Multiple file format support (PDF, Images, Documents, Excel, ZIP)
   - File size validation (10MB max per file)
   - Comment system with rich text support
   - Timeline tracking for all ticket activities
   - Assignment management to engineers
   - Client association and filtering

3. **Ticket Workflow Management**
   - Status transition controls
   - Priority escalation
   - SLA monitoring
   - Resolution time tracking
   - Ticket reassignment capabilities
   - Bulk operations for administrators

### 👥 User Management & Authentication
1. **Multi-Role User System**
   - **Super Admin**: Full system access and user management
   - **Admin**: Comprehensive administrative privileges
   - **Support/Engineer**: Ticket handling and resolution
   - **Site Admin**: Company-specific management
   - **User**: Basic ticket creation and viewing

2. **Advanced Authentication Features**
   - Firebase Authentication integration
   - JWT token verification
   - Role-based access control (RBAC)
   - Password change capabilities
   - Initial password change workflow
   - Session management and security

3. **User Profile Management**
   - Comprehensive user profiles
   - Contact information management
   - Employment details tracking
   - Manager assignment
   - Employee ID management
   - Role and permission management

### 🏢 Client & Company Management
1. **Client Organization Management**
   - Company information management
   - Website and location tracking
   - Contact number management
   - Contract status monitoring
   - Service agreement tracking

2. **Contact Person Management**
   - Authorized contact management
   - Site administrator management
   - Multiple contact types support
   - Designation and role tracking
   - Email and phone number management

3. **Client Relationship Features**
   - Client-specific ticket filtering
   - Company-based user management
   - Contract expiration alerts
   - Client performance metrics

### 📊 Advanced Analytics & Reporting
1. **Real-Time Dashboard**
   - Live ticket statistics
   - Performance metrics
   - Agent productivity tracking
   - Company-specific analytics
   - Real-time updates via WebSocket

2. **Comprehensive Reporting System**
   - Ticket volume trends
   - Resolution time analytics
   - Client performance reports
   - Engineer productivity metrics
   - Custom date range filtering
   - Export capabilities

3. **Advanced Analytics Features**
   - Multi-dimensional filtering
   - Real-time data streaming
   - Historical trend analysis
   - Performance benchmarking
   - Custom metric calculations

### 🔔 Notification & Communication System
1. **Real-Time Notifications**
   - WebSocket-based real-time updates
   - Push notifications
   - Email notifications
   - In-app notification center
   - Notification preferences

2. **Email Integration**
   - Office365 SMTP integration
   - Automated email alerts
   - Customizable email templates
   - Bulk email capabilities
   - Delivery status tracking

3. **Communication Features**
   - Ticket comment notifications
   - Status change alerts
   - Assignment notifications
   - Due date reminders
   - Escalation alerts

### 🛠️ Administrative Tools
1. **Admin Management Panel**
   - User role management
   - Permission configuration
   - System configuration
   - Login activity monitoring
   - Security settings

2. **Engineer Management**
   - Engineer assignment
   - Performance tracking
   - Workload distribution
   - Skill assessment
   - Training tracking

3. **System Administration**
   - Database management
   - Backup and restore
   - System monitoring
   - Performance optimization
   - Security auditing

### 📱 User Interface & Experience
1. **Modern Responsive Design**
   - Mobile-first responsive design
   - Material-UI component library
   - Tailwind CSS styling
   - Dark/Light theme support
   - Custom icon system

2. **Advanced UI Components**
   - Data tables with sorting/filtering
   - Advanced forms with validation
   - Modal dialogs and popups
   - Progress indicators
   - Loading states and animations

3. **User Experience Features**
   - Intuitive navigation
   - Search and filtering
   - Keyboard shortcuts
   - Accessibility features
   - Performance optimization

### 🔒 Security & Data Protection
1. **Authentication & Authorization**
   - Firebase security rules
   - Role-based access control
   - Token-based authentication
   - Secure session management
   - Multi-factor authentication support

2. **Data Security**
   - Input validation and sanitization
   - SQL injection prevention
   - XSS protection
   - File upload security
   - Data encryption

3. **Audit & Compliance**
   - Activity logging
   - User action tracking
   - Security event monitoring
   - Compliance reporting
   - Data retention policies

### 🚀 Performance & Scalability
1. **Real-Time Performance**
   - WebSocket optimization
   - Real-time data streaming
   - Efficient caching strategies
   - Database query optimization
   - Load balancing support

2. **Scalability Features**
   - Firebase scalability
   - Microservices architecture
   - Horizontal scaling support
   - Performance monitoring
   - Resource optimization

3. **Development & Deployment**
   - Docker containerization
   - CI/CD pipeline support
   - Environment management
   - Monitoring and logging
   - Backup and recovery

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase project setup
- Office365 email credentials
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ticketing-tool_python
   ```

2. **Frontend Setup**
   ```bash
   cd it_ticketing_tool/it_ticketing_frontend
   npm install
   npm start
   ```

3. **Backend Setup**
   ```bash
   cd it_ticketing_tool/ticketing_tool_backend
   npm install
   node server.js
   ```

4. **Docker Deployment (Optional)**
   ```bash
   cd it_ticketing_tool/ticketing_tool_backend
   docker-compose up -d
   ```

5. **Environment Configuration**
   - Set up Firebase project credentials
   - Configure email SMTP settings
   - Set environment variables
   - Configure WebSocket settings

### Environment Variables

#### Frontend (.env)
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_API_BASE_URL=http://localhost:5000
```

#### Backend (.env)
```
PORT=5000
type=service_account
project_id=your_project_id
private_key_id=your_private_key_id
private_key=your_private_key
client_email=your_client_email
client_id=your_client_id
auth_uri=https://accounts.google.com/o/oauth2/auth
token_uri=https://oauth2.googleapis.com/token
auth_provider_x509_cert_url=https://www.googleapis.com/oauth2/v1/certs
client_x509_cert_url=your_cert_url
universe_domain=googleapis.com
FIREBASE_STORAGE_BUCKET=your_storage_bucket
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
WEBSOCKET_PORT=5001
```

## 🔐 Security Features

1. **Authentication**
   - Firebase Authentication integration
   - JWT token verification
   - Secure session management
   - Password policy enforcement

2. **Authorization**
   - Role-based access control
   - Route protection middleware
   - Super admin privileges
   - Permission-based features

3. **Data Protection**
   - Input validation and sanitization
   - SQL injection prevention
   - XSS protection
   - File upload security
   - Data encryption

4. **File Security**
   - Secure file upload validation
   - File type restrictions
   - Storage bucket security rules
   - Virus scanning integration

## 📊 Database Schema

### Collections Structure

1. **users**
   - User profiles and authentication data
   - Role and permission management
   - Contact information and employment details
   - Manager assignments and relationships

2. **tickets**
   - Ticket details and metadata
   - Status tracking and history
   - Assignment and priority information
   - Client and asset associations

3. **clients**
   - Client organization data
   - Contact information
   - Service agreements and contracts
   - Company performance metrics

4. **notifications**
   - Real-time notification data
   - User preferences
   - Delivery status
   - Notification history

5. **activities**
   - User activity logging
   - System audit trails
   - Performance metrics
   - Security event tracking

## 🧪 Testing

### Frontend Testing
```bash
cd it_ticketing_tool/it_ticketing_frontend
npm test
```

### Backend Testing
```bash
cd it_ticketing_tool/ticketing_tool_backend
npm test
```

### QA Testing
- Comprehensive test cases available in `QA_TESTING_README.md`
- User and engineer perspective testing
- Role-based access testing
- Performance and security testing

## 📦 Deployment

### Frontend Deployment
```bash
cd it_ticketing_tool/it_ticketing_frontend
npm run build
firebase deploy --only hosting
```

### Backend Deployment
```bash
cd it_ticketing_tool/ticketing_tool_backend
npm start
```

### Docker Deployment
```bash
cd it_ticketing_tool/ticketing_tool_backend
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Note**: This documentation is maintained alongside the codebase. For the most up-to-date information, refer to the inline code comments and configuration files.

## 🔐 Role-Based Access Control Matrix

| **Role**        | **Read All Tickets** | **Edit Tickets**    | **Create Tickets**  | **Admin Panel** | **User Management** | **Client Management** | **Analytics Access** |
| --------------- | -------------------- | ------------------- | ------------------- | ---------------- | -------------------- | --------------------- | -------------------- |
| **Super Admin** | ✅ Yes                | ❌ No                | ✅ Yes (as reporter) | ✅ Full Access   | ✅ Full Access       | ✅ Full Access        | ✅ Full Access       |
| **Admin**       | ✅ Yes                | ✅ Yes               | ✅ Yes (as reporter) | ✅ Full Access   | ✅ Full Access       | ✅ Full Access        | ✅ Full Access       |
| **Support**     | ✅ Yes                | ✅ Yes               | ✅ Yes (as reporter) | ❌ No            | ❌ No                | ❌ No                 | ✅ Limited Access    |
| **Site Admin**  | ✅ Yes (own company)  | ❌ No                | ✅ Yes (as reporter) | ❌ No            | ❌ No                | ✅ Own Company Only   | ✅ Own Company Only  |
| **User**        | ✅ Yes (own tickets)  | ✅ Yes (own tickets) | ✅ Yes               | ❌ No            | ❌ No                | ❌ No                 | ❌ No                |
