#!/bin/bash
# deploy.sh - Deploy Crowd Monitoring API to GCP Cloud Run
# Usage: ./deploy.sh -p "your-gcp-project-id" [-r "us-central1"] [-s "crowd-monitoring-api"] [-k "path/to/key.json"]

PROJECT_ID=""
REGION="us-central1"
SERVICE_NAME="crowd-monitoring-api"
KEY_FILE=""

while getopts "p:r:s:k:" opt; do
  case $opt in
    p) PROJECT_ID="$OPTARG" ;;
    r) REGION="$OPTARG" ;;
    s) SERVICE_NAME="$OPTARG" ;;
    k) KEY_FILE="$OPTARG" ;;
    \?) echo "Invalid option -$OPTARG" >&2; exit 1 ;;
  esac
done

echo "========================================================="
echo "      GCP Cloud Run Deployer - Crowd Monitoring API      "
echo "========================================================="

if [ -z "$PROJECT_ID" ]; then
    read -p "Enter your GCP Project ID: " PROJECT_ID
    if [ -z "$PROJECT_ID" ]; then
        echo "Error: Project ID is required. Exiting."
        exit 1
    fi
fi

# 1. Authenticate if KeyFile is provided
if [ -n "$KEY_FILE" ]; then
    if [ ! -f "$KEY_FILE" ]; then
        echo "Error: Key file not found at: $KEY_FILE. Exiting."
        exit 1
    fi
    echo "🔐 Authenticating using service account key file..."
    gcloud auth activate-service-account --key-file="$KEY_FILE"
    if [ $? -ne 0 ]; then
        echo "Error: Authentication failed. Exiting."
        exit 1
    fi
else
    echo "ℹ️ Using existing gcloud credentials. (Run 'gcloud auth login' first if not authenticated)"
fi

# 2. Set Active Project
echo "⚙️ Setting active project to '$PROJECT_ID'..."
gcloud config set project "$PROJECT_ID"
if [ $? -ne 0 ]; then
    echo "Error: Failed to set GCP project. Exiting."
    exit 1
fi

# 3. Enable Required Services
echo "🔌 Enabling required GCP services (Cloud Run, Cloud Build, Artifact Registry)..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
if [ $? -ne 0 ]; then
    echo "Error: Failed to enable required GCP services. Exiting."
    exit 1
fi

# 4. Check/Create Artifact Registry Repository
REPO_NAME="crowd-monitoring"
echo "📦 Checking if Artifact Registry repository '$REPO_NAME' exists in '$REGION'..."
repo_exists=$(gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" --format="value(name)" 2>/dev/null)

if [ -z "$repo_exists" ]; then
    echo "📦 Repository '$REPO_NAME' not found. Creating..."
    gcloud artifacts repositories create "$REPO_NAME" \
        --repository-format=docker \
        --location="$REGION" \
        --description="Docker repository for Crowd Monitoring API"
    if [ $? -ne 0 ]; then
        echo "Error: Failed to create Artifact Registry repository. Exiting."
        exit 1
    fi
else
    echo "✅ Repository '$REPO_NAME' already exists."
fi

# 5. Build Image using Cloud Build (bypasses local Docker requirements)
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"
echo "🚀 Submitting build to Google Cloud Build (this may take a few minutes)..."
echo "Image Tag: $IMAGE_TAG"

gcloud builds submit --tag "$IMAGE_TAG" .
if [ $? -ne 0 ]; then
    echo "Error: Cloud Build failed. Exiting."
    exit 1
fi
echo "✅ Cloud Build completed successfully!"

# 6. Deploy to Cloud Run
echo "🚀 Deploying to Google Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
    --image "$IMAGE_TAG" \
    --platform managed \
    --region "$REGION" \
    --no-cpu-throttling \
    --min-instances 1 \
    --max-instances 1 \
    --cpu 2 \
    --memory 4Gi \
    --allow-unauthenticated \
    --port 8080 \
    --set-env-vars ENV=production
if [ $? -ne 0 ]; then
    echo "Error: Cloud Run deployment failed. Exiting."
    exit 1
fi

echo "========================================================="
echo "🎉 Deployment completed successfully!"
echo "========================================================="
