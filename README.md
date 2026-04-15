# Chatbot AI - Ethereal Intelligence v2.0

## 🚀 Quick Start

### Requirements
- Node.js 20+ (Strictly enforced via `.nvmrc` and `engines` for ONNX cross-platform compatibility)
- npm 10+
- Docker & Docker Compose (required for the ChromaDB Vector Database)
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

There are two ways to run the Ethereal Intelligence infrastructure:

#### Method 1: Using Docker Compose (Recommended)
This approach automatically orchestrates the frontend, backend, and ChromaDB vector database flawlessly in the background using Linux Alpine/Slim sealed environments.

```bash
# From the root directory, rebuild and start all containers in detached mode:
docker-compose up -d --build
```
Your UI will be instantly available at **http://localhost:5173**.

* **Viewing Logs**: To watch logs for a specific service in real-time without locking your terminal, open a console in the root directory and run:
  - `docker-compose logs -f backend` 
  - `docker-compose logs -f frontend`
  - `docker-compose logs -f chromadb`
* **Shutting Down**: Cleanly stop everything using `docker-compose down`

#### Method 2: Hybrid Local Mode (Node.js + Docker ChromaDB)
If you prefer running Node.js locally without containerizing your Express/Vite servers, you still **must** run ChromaDB via Docker for the RAG system to work.

**Terminal 1 - ChromaDB Vector Database (Port 8000):**
```bash
docker run --name chatbot_chroma -p 8000:8000 -v $(pwd)/chroma_data:/chroma/chroma chromadb/chroma:latest
```

**Terminal 2 - Backend (Port 3001):**
```bash
cd backend
npm run dev
```

**Terminal 3 - Frontend (Port 5173):**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

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

### ChromaConnectionError: Failed to connect to chromadb

1. **Database is Off**: Your backend likely threw an `Upload Error` or `ChromaConnectionError` because ChromaDB isn't running. Ensure your vector database container is spun up (`docker-compose up chromadb` or `docker run ... chromadb/chroma`).
2. **Anonymous Volumes Caching Old Modules**: If Docker Compose is throwing a missing package error (like `@huggingface/transformers`), or Alpine throws an `ld-linux` linking error on `onnxruntime`, try resetting your internal `node_modules` anonymous volumes by tearing everything down completely with `docker-compose down -v` and rebuilding via `docker-compose up --build`.

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
