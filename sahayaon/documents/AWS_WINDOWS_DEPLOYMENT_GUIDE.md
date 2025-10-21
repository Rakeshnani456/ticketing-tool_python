# AWS Windows Instance Deployment Guide

This guide will help you deploy your ticketing tool backend to an AWS Windows instance using Docker.

## Prerequisites

### 1. AWS Windows Instance Setup
- **Instance Type**: t3.medium or larger (recommended for Docker)
- **OS**: Windows Server 2019/2022 or Windows 10/11
- **Security Groups**: Open port 5000 (or your chosen port) for inbound traffic
- **Storage**: At least 20GB free space

### 2. Required Software on AWS Instance
- Docker Desktop for Windows
- PowerShell 5.1+ (usually pre-installed)
- Git (optional, for cloning repository)

## Step-by-Step Deployment

### Step 1: Prepare Your AWS Instance

1. **Connect to your AWS Windows instance** via RDP
2. **Install Docker Desktop for Windows**:
   - Download from: https://www.docker.com/products/docker-desktop
   - Install and restart the instance
   - Ensure Docker Desktop is running

3. **Configure Windows Firewall** (if needed):
   ```powershell
   # Open PowerShell as Administrator
   New-NetFirewallRule -DisplayName "Ticketing Backend" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
   ```

### Step 2: Transfer Your Code

**Option A: Using Git (Recommended)**
```powershell
# Clone your repository
git clone <your-repository-url>
cd it_ticketing_tool/ticketing_tool_backend
```

**Option B: Using File Transfer**
1. Zip your `ticketing_tool_backend` folder
2. Upload to AWS instance via RDP or S3
3. Extract the files

### Step 3: Configure Environment Variables

1. **Copy the environment template**:
   ```powershell
   copy env.template .env
   ```

2. **Edit the .env file** with your actual values:
   ```powershell
   notepad .env
   ```

3. **Fill in your Firebase configuration**:
   - Get your Firebase service account key from Firebase Console
   - Copy the values from your Firebase config
   - Set your email credentials for notifications

### Step 4: Deploy Using the Automated Script

1. **Run the deployment script**:
   ```powershell
   # Basic deployment
   .\deploy-windows.ps1

   # With custom port
   .\deploy-windows.ps1 -Port 8080

   # Skip build if image already exists
   .\deploy-windows.ps1 -SkipBuild
   ```

2. **Monitor the deployment**:
   - The script will show progress and any errors
   - Wait for "Container is healthy" message

### Step 5: Verify Deployment

1. **Check container status**:
   ```powershell
   docker ps
   ```

2. **Test the API**:
   ```powershell
   # Test health endpoint
   Invoke-WebRequest -Uri "http://localhost:5000/health"

   # Test from external machine (replace with your AWS public IP)
   Invoke-WebRequest -Uri "http://YOUR_AWS_PUBLIC_IP:5000/health"
   ```

3. **View logs**:
   ```powershell
   docker logs -f ticketing-backend
   ```

## Manual Deployment (Alternative)

If you prefer manual deployment:

```powershell
# 1. Build the Docker image
docker build -t ticketing-backend:latest .

# 2. Run the container
docker run -d \
  --name ticketing-backend \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v "${PWD}\logs:/app/logs" \
  ticketing-backend:latest

# 3. Check status
docker ps
docker logs ticketing-backend
```

## Management Commands

### Container Management
```powershell
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# Stop container
docker stop ticketing-backend

# Start container
docker start ticketing-backend

# Restart container
docker restart ticketing-backend

# Remove container
docker rm -f ticketing-backend
```

### Logs and Monitoring
```powershell
# View logs
docker logs ticketing-backend

# Follow logs in real-time
docker logs -f ticketing-backend

# View last 100 lines
docker logs --tail 100 ticketing-backend
```

### Updates and Maintenance
```powershell
# Update the application
git pull  # if using git
docker build -t ticketing-backend:latest .
docker stop ticketing-backend
docker rm ticketing-backend
.\deploy-windows.ps1
```

## Troubleshooting

### Common Issues

1. **Docker not running**:
   - Start Docker Desktop
   - Check if Windows containers are enabled

2. **Port already in use**:
   ```powershell
   # Find process using port 5000
   netstat -ano | findstr :5000
   
   # Kill the process (replace PID)
   taskkill /PID <PID> /F
   ```

3. **Firebase connection issues**:
   - Verify your .env file has correct Firebase credentials
   - Check if your AWS instance can reach Firebase (internet access)

4. **Container won't start**:
   ```powershell
   # Check container logs
   docker logs ticketing-backend
   
   # Check if .env file exists and is valid
   Get-Content .env
   ```

5. **Health check failing**:
   - Ensure your server.js has a `/health` endpoint
   - Check if the application is binding to 0.0.0.0:5000

### Performance Optimization

1. **Increase Docker resources**:
   - Open Docker Desktop settings
   - Go to Resources → Advanced
   - Increase CPU and Memory limits

2. **Enable Docker BuildKit** (for faster builds):
   ```powershell
   $env:DOCKER_BUILDKIT=1
   ```

3. **Use Docker Compose** (for complex setups):
   ```powershell
   docker-compose up -d
   ```

## Security Considerations

1. **Firewall Configuration**:
   - Only open necessary ports (5000)
   - Consider using a reverse proxy (nginx) for production

2. **Environment Variables**:
   - Never commit .env file to version control
   - Use AWS Secrets Manager for production secrets

3. **Container Security**:
   - The container runs as non-root user
   - Regular security updates for base image

## Production Recommendations

1. **Use a reverse proxy** (nginx) in front of your application
2. **Set up SSL/TLS** certificates
3. **Configure log rotation** for the logs directory
4. **Set up monitoring** and alerting
5. **Use AWS Application Load Balancer** for high availability
6. **Implement backup strategies** for your data

## Support

If you encounter issues:
1. Check the logs: `docker logs ticketing-backend`
2. Verify your .env configuration
3. Ensure Docker Desktop is running
4. Check Windows Firewall settings
5. Verify AWS Security Group settings

## Next Steps

After successful deployment:
1. Configure your frontend to point to the AWS instance
2. Set up domain name and SSL certificates
3. Implement monitoring and logging
4. Set up automated backups
5. Configure CI/CD pipeline for updates



