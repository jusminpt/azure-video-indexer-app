#!/bin/bash

# Variables
RESOURCE_GROUP="video-indexer-app-rg"
LOCATION="eastus"
APP_NAME="video-indexer-webapp"
APP_SERVICE_PLAN="video-indexer-plan"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service plan
az appservice plan create --name $APP_SERVICE_PLAN --resource-group $RESOURCE_GROUP --sku B1 --is-linux

# Create web app
az webapp create --name $APP_NAME --resource-group $RESOURCE_GROUP --plan $APP_SERVICE_PLAN --runtime "NODE|14-lts"

# Configure web app settings
az webapp config set --name $APP_NAME --resource-group $RESOURCE_GROUP --startup-file "npm run start"

# Deploy the app
az webapp deployment source config-local-git --name $APP_NAME --resource-group $RESOURCE_GROUP

# Get the deployment URL
DEPLOYMENT_URL=$(az webapp deployment source config-local-git --name $APP_NAME --resource-group $RESOURCE_GROUP --query url --output tsv)

echo "Deployment URL: $DEPLOYMENT_URL"
echo "Use this URL as your git remote to push your code."

# Set environment variables
az webapp config appsettings set --name $APP_NAME --resource-group $RESOURCE_GROUP --settings COMPUTER_VISION_API_ENDPOINT=$COMPUTER_VISION_API_ENDPOINT
az webapp config appsettings set --name $APP_NAME --resource-group $RESOURCE_GROUP --settings COMPUTER_VISION_API_KEY=$COMPUTER_VISION_API_KEY
az webapp config appsettings set --name $APP_NAME --resource-group $RESOURCE_GROUP --settings AZURE_SEARCH_ENDPOINT=$AZURE_SEARCH_ENDPOINT
az webapp config appsettings set --name $APP_NAME --resource-group $RESOURCE_GROUP --settings AZURE_SEARCH_API_KEY=$AZURE_SEARCH_API_KEY
az webapp config appsettings set --name $APP_NAME --resource-group $RESOURCE_GROUP --settings AZURE_SEARCH_INDEX_NAME=$AZURE_SEARCH_INDEX_NAME

echo "Environment variables have been set in Azure App Service."

