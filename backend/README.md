# FiNIX Backend - AI Financial Assistant

A production-ready backend service for the FiNIX AI financial assistant, integrating Firebase Authentication, Google Gemini AI, and Fi Money's MCP (Model Context Protocol) API to provide intelligent financial insights.

## 🏗️ Architecture

- **Node.js + Express** - REST API server
- **Firebase Authentication** - User authentication & authorization
- **Google Gemini AI** - Natural language processing with function calling
- **Fi Money MCP** - Real-time financial data integration
- **Google Cloud Run** - Serverless deployment
- **Winston + Cloud Logging** - Comprehensive logging
- **Helmet + Rate Limiting** - Security & protection

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Google Cloud Project with billing enabled
- Firebase project
- Fi Money account (for testing)

### Local Development

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd finix/backend
npm install
```

2. **Set up environment variables:**
```bash
# Copy the example file
cp .env.example .env

# Edit .env with your actual values
GCP_PROJECT_ID=your-gcp-project-id
FIREBASE_SERVICE_ACCOUNT_KEY={"type": "service_account", ...}
FI_MCP_ENDPOINT=https://mcp.fi.money:8080/mcp/stream
NODE_ENV=development
```

3. **Start development server:**
```bash
npm run dev
```

4. **Test the API:**
```bash
curl http://localhost:8080/health
```

## 📚 API Documentation

### Authentication Endpoints

#### `GET /api/auth/status`
Get current authentication status for both Firebase and Fi MCP.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Response:**
```json
{
  "success": true,
  "firebase": {
    "authenticated": true,
    "user": {
      "uid": "user-id",
      "email": "user@example.com",
      "name": "User Name"
    }
  },
  "fiMcp": {
    "authenticated": false,
    "message": "Please connect your Fi Money account"
  }
}
```

#### `POST /api/auth/fi-mcp/initiate`
Initiate Fi MCP authentication process.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

**Body:**
```json
{
  "phoneNumber": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "loginUrl": "https://fi.money/auth/...",
    "sessionId": "session-id",
    "instructions": [
      "1. Click the login link to open Fi Money authentication",
      "2. Enter your Fi-registered phone number",
      "3. Open Fi Money app",
      "4. Navigate to Net Worth Dashboard > Talk to AI > Get Passcode",
      "5. Copy the passcode and provide it to continue"
    ]
  }
}
```

#### `POST /api/auth/fi-mcp/complete`
Complete Fi MCP authentication with passcode.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

**Body:**
```json
{
  "passcode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "expiresAt": "2024-01-01T12:30:00Z",
    "netWorthSummary": {
      "totalNetWorth": 1500000,
      "assets": 2000000,
      "liabilities": 500000
    }
  }
}
```

### Chat Endpoints

#### `POST /api/chat`
Send message to AI assistant.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

**Body:**
```json
{
  "message": "What is my current net worth?",
  "chatHistory": [
    {
      "role": "user",
      "parts": [{"text": "Hello"}]
    },
    {
      "role": "model", 
      "parts": [{"text": "Hi! How can I help you?"}]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "response": "Based on your latest financial data, your current net worth is ₹15,00,000. This includes ₹20,00,000 in assets and ₹5,00,000 in liabilities...",
  "user": {
    "uid": "user-id",
    "name": "User Name",
    "email": "user@example.com"
  },
  "authStatus": {
    "authenticated": true,
    "message": "You are connected to Fi Money"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### `GET /api/chat/suggestions`
Get suggested questions based on authentication status.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Response:**
```json
{
  "success": true,
  "suggestions": [
    "What is my current net worth?",
    "How are my mutual funds performing?",
    "Which investments are underperforming?",
    "What is my asset allocation?"
  ],
  "authStatus": {
    "authenticated": true
  }
}
```

## 🔧 Gemini Function Calling

The backend implements intelligent function calling with Gemini AI to automatically invoke Fi MCP endpoints based on user queries:

### Available Functions

1. **`getNetWorth`** - Retrieves complete net worth information
2. **`getMutualFunds`** - Gets mutual fund holdings and performance
3. **`getStocks`** - Fetches stock portfolio (Indian & US)
4. **`getLoansAndCreditCards`** - Returns debt and liability information
5. **`getPortfolioAnalysis`** - Provides comprehensive portfolio analysis
6. **`initiateAuthentication`** - Starts Fi MCP auth flow
7. **`completeAuthentication`** - Completes Fi MCP auth with passcode

### Example User Queries

- "What's my net worth?" → Calls `getNetWorth()`
- "How are my SIPs performing?" → Calls `getMutualFunds()`
- "Show me my US stocks" → Calls `getStocks()` with region filter
- "Do I have any high-interest loans?" → Calls `getLoansAndCreditCards()`

## 🔒 Security Features

### Authentication & Authorization
- Firebase ID token verification
- User context isolation
- Secure token handling

### Rate Limiting
- 30 requests/minute per user for chat
- 10 requests/minute per user for auth
- 1000 requests/15 minutes globally

### Security Headers
- Helmet.js for security headers
- CORS configuration
- Content Security Policy

### Data Protection
- Input validation with Joi
- Sensitive data masking in logs
- Secure Fi MCP token management

## 🚀 Deployment

### Google Cloud Run Deployment

1. **Build and deploy:**
```bash
# Build Docker image
docker build -t finix-backend .

# Tag for GCR
docker tag finix-backend gcr.io/YOUR_PROJECT_ID/finix-backend

# Push to registry
docker push gcr.io/YOUR_PROJECT_ID/finix-backend

# Deploy to Cloud Run
gcloud run deploy finix-backend \
  --image gcr.io/YOUR_PROJECT_ID/finix-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account finix-cloud-run-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production \
  --set-env-vars GCP_PROJECT_ID=YOUR_PROJECT_ID \
  --set-env-vars FI_MCP_ENDPOINT=https://mcp.fi.money:8080/mcp/stream
```

2. **Set up secrets:**
```bash
# Store Firebase service account key
gcloud secrets create FIREBASE_SERVICE_ACCOUNT_KEY \
  --data-file=path/to/service-account.json

# Grant access to Cloud Run service account
gcloud secrets add-iam-policy-binding FIREBASE_SERVICE_ACCOUNT_KEY \
  --member=serviceAccount:finix-cloud-run-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Environment Variables

#### Required
- `GCP_PROJECT_ID` - Your Google Cloud Project ID
- `NODE_ENV` - Environment (development/production)
- `FI_MCP_ENDPOINT` - Fi MCP API endpoint

#### Optional
- `PORT` - Server port (default: 8080)
- `FRONTEND_URL` - Frontend URL for CORS
- `FIREBASE_SERVICE_ACCOUNT_KEY` - Firebase credentials (JSON string)

## 📊 Monitoring & Logging

### Cloud Logging
- Structured JSON logs
- User action tracking
- Fi MCP interaction logs
- Security event monitoring

### Health Checks
- `/health` endpoint for status monitoring
- Docker health checks
- Uptime monitoring

### Error Handling
- Comprehensive error categorization
- User-friendly error messages
- Automatic retry suggestions
- Security event logging

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Test health endpoint
curl https://your-cloud-run-url/health

# Test authentication (requires valid Firebase token)
curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
     https://your-cloud-run-url/api/auth/status
```

## 📈 Performance Optimization

### Production Features
- Multi-stage Docker builds
- Non-root container user
- Memory-efficient logging
- Connection pooling
- Request compression

### Caching Strategy
- In-memory Fi MCP token caching
- Automatic token cleanup
- Session management

## 🛠️ Development

### Project Structure
```
backend/
├── src/
│   ├── api/          # Route handlers
│   ├── middleware/   # Authentication & validation
│   ├── services/     # Business logic
│   └── utils/        # Utilities & helpers
├── Dockerfile        # Container configuration
├── package.json      # Dependencies
└── server.js         # Application entry point
```

### Adding New Endpoints

1. Create route handler in `src/api/`
2. Add business logic in `src/services/`
3. Implement validation schemas
4. Add comprehensive error handling
5. Update documentation

### Contributing

1. Follow existing code patterns
2. Add comprehensive logging
3. Include input validation
4. Write error handling
5. Update documentation

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Support

For issues and questions:
- Create GitHub issue
- Check logs in Google Cloud Console
- Review API documentation
- Test with health endpoints

---

**Built with ❤️ for intelligent financial management**