# Chatbot AI - Ethereal Intelligence v2.0

## 🚀 Quick Start

### Requirements
- Node.js 18+
- npm 9+
- Groq API Key (configured in `/backend/.env`)

### Installation

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Execution

**Terminal 1 - Backend (Port 3001):**
```bash
cd backend
npm start
```

You should see:
```
✅ Groq client initialized successfully
🚀 Chatbot AI API started
📍 Server running on http://localhost:3001
🔑 Groq: ✅ Connected
```

**Terminal 2 - Frontend (Port 5173):**
```bash
cd frontend
npm run dev
```

You should see:
```
➜  Local:   http://localhost:5173/
```

Then open **http://localhost:5173** in your browser.

---

## 📋 Available Scripts

### Backend (`/backend/package.json`)
- `npm start` - Runs with Node.js (recommended)
- `npm run dev` - Alias for `npm start`
- `npm run dev:watch` - Runs with nodemon (requires local nodemon installation)

### Frontend (`/frontend/package.json`)
- `npm run dev` - Starts development server (Vite)
- `npm run build` - Builds for production
- `npm run preview` - Previews build

---

## 🔧 Configuration

### Backend (.env)
```
GROQ_API_KEY=your_api_key_here
PORT=3001
```

### API Endpoints

#### GET `/`
Server status page (static HTML)

#### GET `/health`
Checks connection status
```json
{
  "status": "ok",
  "server": "running",
  "groqReady": true,
  "apiKeyConfigured": true,
  "timestamp": "2024-03-24T10:00:00.000Z"
}
```

#### POST `/chat`
Sends a message and receives Groq response
```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, how do you work?"}'
```

Response:
```json
{
  "reply": "I am an artificial intelligence interface..."
}
```

---

## 🎨 UI Features

- **Ethereal Design**: Glassmorphism with blur effects
- **Dark Theme**: Custom color scheme with cyan accents (#59e7fc)
- **Smooth Animations**: Fade-in, bounce, transitions
- **Responsive**: Mobile-first design
- **Accessibility**: Improved contrast, clear labels

---

## 🐛 Troubleshooting

### Backend doesn't work but I can start it

1. **Verify Groq initialized:**
   ```bash
   # Should show ✅ in output
   npm start
   ```

2. **Test health endpoint:**
   ```bash
   curl http://localhost:3001/health
   ```

### Frontend doesn't connect to Backend

1. **Verify CORS:** Backend has CORS enabled for all origins in development
2. **Verify ports:**
   - Backend: `http://localhost:3001`
   - Frontend: `http://localhost:5173`
3. **Check browser Console:** F12 > Console to see errors

### API Key Error

1. Verify that `.env` in `/backend/` has the correct API Key
2. Restart the backend after changing `.env`

---

## 📞 Support

To report issues:
1. Check terminal logs
2. Test the `/health` endpoint
3. Verify that Groq is connected

---

**Version:** 2.0  
**Last updated:** March 24, 2026
