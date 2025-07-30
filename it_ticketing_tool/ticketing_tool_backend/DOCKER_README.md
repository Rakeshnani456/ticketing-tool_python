# Docker Setup for Ticketing Tool Backend

This guide will help you run the ticketing tool backend in Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed
- Firebase service account credentials
- Office365 email credentials

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
NODE_ENV=production
PORT=5000

# Firebase Configuration
type=service_account
project_id=your-firebase-project-id
private_key_id=your-private-key-id
private_key="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
client_email=your-service-account@your-project.iam.gserviceaccount.com
client_id=your-client-id
auth_uri=https://accounts.google.com/o/oauth2/auth
token_uri=https://oauth2.googleapis.com/token
auth_provider_x509_cert_url=https://www.googleapis.com/oauth2/v1/certs
client_x509_cert_url=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com
universe_domain=googleapis.com
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# Email Configuration (Office365)
EMAIL_USER=your-email@kriasol.com
EMAIL_PASS=your-app-password
```

## Running with Docker Compose

### Build and Start
```bash
# Build and start the container
docker-compose up --build

# Run in detached mode (background)
docker-compose up -d --build
```

### Stop the Container
```bash
docker-compose down
```

### View Logs
```bash
# View logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs ticketing-backend
```

## Running with Docker (without Docker Compose)

### Build the Image
```bash
docker build -t ticketing-backend .
```

### Run the Container
```bash
docker run -d \
  --name ticketing-backend \
  -p 5000:5000 \
  --env-file .env \
  ticketing-backend
```

### Stop and Remove Container
```bash
docker stop ticketing-backend
docker rm ticketing-backend
```

## Health Check

The application includes a health check endpoint at `/health` that returns:
- Status: OK
- Timestamp
- Database connection status

You can test it with:
```bash
curl http://localhost:5000/health
```

## Troubleshooting

### Container Won't Start
1. Check if all environment variables are set correctly
2. Verify Firebase credentials are valid
3. Check logs: `docker-compose logs ticketing-backend`

### Database Connection Issues
1. Verify Firebase project ID and credentials
2. Check if the service account has proper permissions
3. Ensure the private key is properly formatted

### Email Issues
1. Verify Office365 credentials
2. Check if app passwords are enabled for the email account
3. Ensure the email account has SMTP permissions

### Port Already in Use
If port 5000 is already in use, modify the `docker-compose.yml` file:
```yaml
ports:
  - "5001:5000"  # Change 5000 to any available port
```

## Development Mode

For development, you can modify the Dockerfile to use nodemon:

```dockerfile
# Install nodemon for development
RUN npm install -g nodemon

# Change the CMD to use nodemon
CMD ["nodemon", "server.js"]
```

## Production Considerations

1. **Security**: Never commit `.env` files to version control
2. **Logs**: Consider using a log aggregation service
3. **Monitoring**: Set up proper monitoring and alerting
4. **Backup**: Implement regular backups of your Firebase data
5. **SSL**: Use a reverse proxy (like nginx) with SSL termination

## API Endpoints

The backend exposes the following endpoints:
- `/health` - Health check
- `/` - Authentication routes
- `/tickets` - Ticket management
- `/admin` - Admin routes
- `/notifications` - Notification routes
- `/api/clients` - Client management
- `/api/users` - User management
- `/dashboard` - Dashboard data
- `/upload-attachment` - File uploads
- `/admin-management` - Admin management 