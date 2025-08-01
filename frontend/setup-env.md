# Frontend Environment Setup

This document provides instructions for setting up the frontend environment variables for the FiNIX AI Assistant.

## Required Environment Variables

Create a `.env` file in the `frontend` directory with the following variables:

```env
# Backend API URL (Backend runs on port 8081)
REACT_APP_API_URL=http://localhost:8081

# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=finix-467107
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

## Important Notes

1. **Firebase Project ID**: Must be `finix-467107` to match the backend configuration
2. **Backend Port**: The backend now runs on port 8081 (MCP server uses port 8080)
3. **API URL**: Points to `http://localhost:8081` for local development

## Getting Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`finix-467107`)
3. Go to Project Settings > General
4. Scroll down to "Your apps" section
5. Click on the web app or create a new one
6. Copy the configuration values

## Troubleshooting

### Firebase Project Mismatch
If you see a warning about Firebase project ID mismatch:
- Ensure `REACT_APP_FIREBASE_PROJECT_ID=finix-467107`
- This must match the backend's `GCP_PROJECT_ID`

### Backend Connection Issues
If the frontend can't connect to the backend:
- Ensure the backend is running on port 8081: `node server.js`
- Check that `REACT_APP_API_URL=http://localhost:8081`
- Verify the backend health endpoint: `http://localhost:8081/health`

### Missing Environment Variables
If you see warnings about missing variables:
- Ensure all required variables are set in your `.env` file
- Restart the development server after making changes
- Check that the `.env` file is in the correct location (`frontend/.env`)

## Development Workflow

1. **Start the MCP Server** (port 8080):
   ```bash
   cd fi-mcp-dev
   set FI_MCP_PORT=8080
   go run .
   ```

2. **Start the Backend** (port 8081):
   ```bash
   cd backend
   node server.js
   ```

3. **Start the Frontend** (port 3000):
   ```bash
   cd frontend
   npm start
   ```

4. **Test the Setup**:
   - Frontend: http://localhost:3000
   - Backend Health: http://localhost:8081/health
   - MCP Server: http://localhost:8080
