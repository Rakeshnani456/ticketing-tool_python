# IT Ticketing Tool

A comprehensive IT ticketing system built with React frontend and Node.js backend, featuring Firebase integration, real-time notifications, and advanced user management capabilities.

## 🏗️ Project Architecture

### Overview
The IT Ticketing Tool is a full-stack web application designed to streamline IT support operations. It follows a modern client-server architecture with the following key components:

- **Frontend**: React.js application with Material-UI and Tailwind CSS
- **Backend**: Node.js/Express.js REST API
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Authentication
- **File Storage**: Firebase Storage
- **Email Service**: Nodemailer with Office365 SMTP
- **Real-time Communication**: WebSocket support

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

#### Backend Technologies
- **Node.js** - Runtime environment
- **Express.js 5.1.0** - Web framework
- **Firebase Admin SDK 13.4.0** - Server-side Firebase integration
- **Nodemailer 7.0.3** - Email functionality
- **CORS 2.8.5** - Cross-origin resource sharing
- **Busboy 1.6.0** - File upload handling
- **WebSocket 8.18.3** - Real-time communication

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
│   │   │   │   │   └── RegisterComponent.js
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
│   │   │   │   │   └── FileUpload.js
│   │   │   │   ├── DashboardComponent.js
│   │   │   │   ├── ProfileComponent.js
│   │   │   │   ├── SettingsComponent.js
│   │   │   │   ├── ChangePasswordComponent.js
│   │   │   │   └── AccessDeniedComponent.js
│   │   │   ├── config/                # Configuration files
│   │   │   │   ├── firebase.js        # Firebase configuration
│   │   │   │   └── constants.js       # Application constants
│   │   │   ├── contexts/              # React contexts
│   │   │   │   └── ThemeContext.js    # Theme management
│   │   │   ├── utils/                 # Utility functions
│   │   │   │   └── utils.js           # Helper functions
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
│       │   └── attachmentRoutes.js    # File attachment endpoints
│       ├── middleware/                # Express middleware
│       │   └── (authentication, validation, etc.)
│       ├── helpers/                   # Helper functions
│       │   └── (utility functions, database helpers)
│       ├── config/                    # Configuration files
│       │   └── (database config, environment variables)
│       ├── server.js                  # Main server file
│       ├── package.json               # Backend dependencies
│       ├── firebase.json              # Firebase functions configuration
│       ├── .firebaserc                # Firebase project configuration
│       └── firebaserules.txt          # Firestore security rules
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

### Frontend Features
1. **User Authentication**
   - Login/Logout functionality
   - Role-based access control
   - Password change capabilities

2. **Ticket Management**
   - Create, view, edit, and delete tickets
   - Ticket status tracking
   - Priority and category management
   - File attachments
   - Comment system with timeline

3. **Dashboard & Analytics**
   - Real-time dashboard with key metrics
   - Ticket statistics and charts
   - Performance indicators

4. **Admin Panel**
   - User management (CRUD operations)
   - Client management
   - Engineer assignment
   - System configuration

5. **Responsive Design**
   - Mobile-friendly interface
   - Modern UI with Material-UI components
   - Dark/Light theme support

### Backend Features
1. **RESTful API**
   - Comprehensive CRUD operations
   - RESTful endpoint design
   - Proper HTTP status codes

2. **Authentication & Authorization**
   - Firebase token verification
   - Role-based middleware
   - Super admin privileges

3. **Database Operations**
   - Firestore integration
   - Real-time data synchronization
   - Efficient querying and indexing

4. **File Management**
   - File upload/download
   - Firebase Storage integration
   - Attachment handling

5. **Email Notifications**
   - Automated email alerts
   - Office365 SMTP integration
   - Customizable email templates

6. **Real-time Features**
   - WebSocket support
   - Live notifications
   - Real-time updates

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase project setup
- Office365 email credentials

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
   npm start
   ```

4. **Environment Configuration**
   - Set up Firebase project credentials
   - Configure email SMTP settings
   - Set environment variables

### Environment Variables

#### Frontend (.env)
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
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
```

## 🔐 Security Features

1. **Authentication**
   - Firebase Authentication integration
   - JWT token verification
   - Secure session management

2. **Authorization**
   - Role-based access control
   - Route protection middleware
   - Super admin privileges

3. **Data Protection**
   - Input validation and sanitization
   - SQL injection prevention
   - XSS protection

4. **File Security**
   - Secure file upload validation
   - File type restrictions
   - Storage bucket security rules

## 📊 Database Schema

### Collections Structure

1. **users**
   - User profiles and authentication data
   - Role and permission management
   - Contact information

2. **tickets**
   - Ticket details and metadata
   - Status tracking and history
   - Assignment and priority information

3. **clients**
   - Client organization data
   - Contact information
   - Service agreements

4. **notifications**
   - Real-time notification data
   - User preferences
   - Delivery status

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

## 📦 Deployment

### Frontend Deployment
```bash
cd it_ticketing_tool/it_ticketing_frontend
npm run build
firebase deploy
```

### Backend Deployment
```bash
cd it_ticketing_tool/ticketing_tool_backend
npm start
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


| **Role**        | **Read All Tickets** | **Edit Tickets**    | **Create Tickets**  |
| --------------- | -------------------- | ------------------- | ------------------- |
| **Super Admin** | ✅ Yes                | ❌ No                | ✅ Yes (as reporter) |
| **Admin**       | ✅ Yes                | ✅ Yes               | ✅ Yes (as reporter) |
| **Support**     | ✅ Yes                | ✅ Yes               | ✅ Yes (as reporter) |
| **Site Admin**  | ✅ Yes (own company)  | ❌ No                | ✅ Yes (as reporter) |
| **User**        | ✅ Yes (own tickets)  | ✅ Yes (own tickets) | ✅ Yes               |
