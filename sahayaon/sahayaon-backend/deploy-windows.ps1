# Windows PowerShell Deployment Script for AWS Instance
# This script deploys the ticketing tool backend using Docker on Windows

param(
    [string]$Environment = "production",
    [string]$Port = "5000",
    [switch]$SkipBuild = $false,
    [switch]$Force = $false
)

Write-Host "🚀 Starting Ticketing Tool Backend Deployment on Windows" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Port: $Port" -ForegroundColor Yellow

# Check if Docker is installed and running
Write-Host "`n📋 Checking Docker installation..." -ForegroundColor Blue
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker is installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed or not running. Please install Docker Desktop for Windows." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if .env file exists
Write-Host "`n📋 Checking environment configuration..." -ForegroundColor Blue
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file based on env.template" -ForegroundColor Yellow
    Write-Host "Copy env.template to .env and fill in your configuration:" -ForegroundColor Yellow
    Write-Host "  copy env.template .env" -ForegroundColor Cyan
    exit 1
}
Write-Host "✅ .env file found" -ForegroundColor Green

# Stop existing container if running
Write-Host "`n🛑 Stopping existing containers..." -ForegroundColor Blue
try {
    docker stop ticketing-backend 2>$null
    docker rm ticketing-backend 2>$null
    Write-Host "✅ Existing containers stopped and removed" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  No existing containers to stop" -ForegroundColor Yellow
}

# Build Docker image
if (-not $SkipBuild) {
    Write-Host "`n🔨 Building Docker image..." -ForegroundColor Blue
    try {
        docker build -t ticketing-backend:latest .
        Write-Host "✅ Docker image built successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to build Docker image" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⏭️  Skipping build (--SkipBuild flag used)" -ForegroundColor Yellow
}

# Create logs directory
Write-Host "`n📁 Creating logs directory..." -ForegroundColor Blue
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-Host "✅ Logs directory created" -ForegroundColor Green
} else {
    Write-Host "✅ Logs directory already exists" -ForegroundColor Green
}

# Run Docker container
Write-Host "`n🚀 Starting Docker container..." -ForegroundColor Blue
try {
    docker run -d `
        --name ticketing-backend `
        --restart unless-stopped `
        -p "${Port}:5000" `
        --env-file .env `
        -v "${PWD}\logs:/app/logs" `
        ticketing-backend:latest
    
    Write-Host "✅ Container started successfully" -ForegroundColor Green
    Write-Host "🌐 Backend is running on http://localhost:$Port" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to start container" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Wait for container to be healthy
Write-Host "`n⏳ Waiting for container to be healthy..." -ForegroundColor Blue
$maxAttempts = 30
$attempt = 0

do {
    Start-Sleep -Seconds 2
    $attempt++
    $healthStatus = docker inspect ticketing-backend --format='{{.State.Health.Status}}' 2>$null
    
    if ($healthStatus -eq "healthy") {
        Write-Host "✅ Container is healthy" -ForegroundColor Green
        break
    }
    
    Write-Host "⏳ Attempt $attempt/$maxAttempts - Status: $healthStatus" -ForegroundColor Yellow
} while ($attempt -lt $maxAttempts)

if ($attempt -eq $maxAttempts) {
    Write-Host "⚠️  Container may not be fully healthy, but it's running" -ForegroundColor Yellow
}

# Show container status
Write-Host "`n📊 Container Status:" -ForegroundColor Blue
docker ps --filter "name=ticketing-backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Show logs
Write-Host "`n📋 Recent logs:" -ForegroundColor Blue
docker logs --tail 20 ticketing-backend

Write-Host "`n🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "Your ticketing tool backend is now running on port $Port" -ForegroundColor Cyan
Write-Host "`nUseful commands:" -ForegroundColor Yellow
Write-Host "  View logs: docker logs -f ticketing-backend" -ForegroundColor White
Write-Host "  Stop container: docker stop ticketing-backend" -ForegroundColor White
Write-Host "  Restart container: docker restart ticketing-backend" -ForegroundColor White
Write-Host "  Remove container: docker rm -f ticketing-backend" -ForegroundColor White



