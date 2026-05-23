# deploy.ps1 - Deploy Crowd Monitoring API to GCP Cloud Run
# Usage: .\deploy.ps1 -ProjectId "your-gcp-project-id" [-Region "us-central1"] [-ServiceName "crowd-monitoring-api"] [-KeyFile "path/to/key.json"]

param (
    [Parameter(Mandatory=$false)]
    [string]$ProjectId,

    [Parameter(Mandatory=$false)]
    [string]$Region = "us-central1",

    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "crowd-monitoring-api",

    [Parameter(Mandatory=$false)]
    [string]$KeyFile
)

# Suppress progress stream for cleaner output
$ProgressPreference = 'SilentlyContinue'

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "      GCP Cloud Run Deployer - Crowd Monitoring API      " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# Prompt for ProjectId if not provided
if (-not $ProjectId) {
    $ProjectId = Read-Host "Enter your GCP Project ID"
    if (-not $ProjectId) {
        Write-Error "Project ID is required. Exiting."
        exit 1
    }
}

# Add gcloud to path in current session if it exists in the default winget path
$defaultGcloudPath = "C:\Users\User\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin"
if (Test-Path $defaultGcloudPath) {
    if ($env:PATH -notlike "*$defaultGcloudPath*") {
        $env:PATH += ";$defaultGcloudPath"
    }
}

# 1. Authenticate if KeyFile is provided
if ($KeyFile) {
    if (-not (Test-Path $KeyFile)) {
        Write-Error "Key file not found at: $KeyFile. Exiting."
        exit 1
    }
    Write-Host "[AUTH] Authenticating using service account key file..." -ForegroundColor Yellow
    gcloud.cmd auth activate-service-account --key-file=$KeyFile
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Authentication failed. Exiting."
        exit 1
    }
} else {
    Write-Host "[INFO] Using existing gcloud credentials. (Run 'gcloud.cmd auth login' first if not authenticated)" -ForegroundColor Yellow
}

# 2. Set Active Project
Write-Host "[CONFIG] Setting active project to '$ProjectId'..." -ForegroundColor Yellow
gcloud.cmd config set project $ProjectId
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to set GCP project. Exiting."
    exit 1
}

# 3. Enable Required Services
Write-Host "[API] Enabling required GCP services (Cloud Run, Cloud Build, Artifact Registry)..." -ForegroundColor Yellow
gcloud.cmd services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to enable required GCP services. Exiting."
    exit 1
}

# 4. Check/Create Artifact Registry Repository
$RepoName = "crowd-monitoring"
Write-Host "[REPO] Checking if Artifact Registry repository '$RepoName' exists in '$Region'..." -ForegroundColor Yellow
$repoExists = gcloud.cmd artifacts repositories describe $RepoName --location=$Region --format="value(name)" 2>$null

if (-not $repoExists) {
    Write-Host "[REPO] Repository '$RepoName' not found. Creating..." -ForegroundColor Yellow
    gcloud.cmd artifacts repositories create $RepoName `
        --repository-format=docker `
        --location=$Region `
        --description="Docker repository for Crowd Monitoring API"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create Artifact Registry repository. Exiting."
        exit 1
    }
} else {
    Write-Host "[INFO] Repository '$RepoName' already exists." -ForegroundColor Green
}

# 5. Build Image using Cloud Build (bypasses local Docker requirements)
$ImageTag = "${Region}-docker.pkg.dev/${ProjectId}/${RepoName}/${ServiceName}:latest"
Write-Host "[BUILD] Submitting build to Google Cloud Build (this may take a few minutes)..." -ForegroundColor Yellow
Write-Host "Image Tag: $ImageTag" -ForegroundColor DarkGray

gcloud.cmd builds submit --tag $ImageTag .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Cloud Build failed. Exiting."
    exit 1
}
Write-Host "[SUCCESS] Cloud Build completed successfully!" -ForegroundColor Green

# 6. Deploy to Cloud Run
Write-Host "[DEPLOY] Deploying to Google Cloud Run..." -ForegroundColor Yellow
gcloud.cmd run deploy $ServiceName `
    --image $ImageTag `
    --platform managed `
    --region $Region `
    --no-cpu-throttling `
    --min-instances 1 `
    --max-instances 1 `
    --cpu 2 `
    --memory 4Gi `
    --allow-unauthenticated `
    --port 8080 `
    --set-env-vars ENV=production
if ($LASTEXITCODE -ne 0) {
    Write-Error "Cloud Run deployment failed. Exiting."
    exit 1
}

Write-Host "=========================================================" -ForegroundColor Green
Write-Host "[SUCCESS] Deployment completed successfully!" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
