#!/bin/bash

# Variables
RESOURCE_GROUP="video-indexer-app"
LOCATION="southeastasia"
APP_NAME="video-indexer-webapp"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Static Web App
az staticwebapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --source https://github.com/YOUR_USERNAME/YOUR_REPO \
  --branch main \
  --app-location "/" \
  --output-location "build" \
  --login-with-github

# Get the deployment token
DEPLOYMENT_TOKEN=$(az staticwebapp secrets list --name $APP_NAME --resource-group $RESOURCE_GROUP --query "properties.apiKey" -o tsv)

echo "Deployment token: $DEPLOYMENT_TOKEN"
echo "Use this token in your GitHub Actions workflow"

