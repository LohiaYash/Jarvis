# Installation Guide

## Prerequisites

- Node.js 20.11 or newer
- npm 10 or newer
- Docker Desktop
- FFmpeg for video workflows
- Optional: Ollama for local model fallback

## Environment

Copy `.env.example` to `.env` and set:

- `JWT_SECRET`
- `ENCRYPTION_KEY_BASE64`
- `JARVIS_SAFE_WORKSPACE`
- Provider API keys for any cloud model or voice service you want enabled

Generate a 32-byte encryption key:

```bash
openssl rand -base64 32
```

## Development Startup

```bash
npm install
docker compose up postgres redis chroma
npm run dev
```

## Health Check

```bash
curl http://localhost:4010/api/health
```

## First Message

```bash
curl -X POST http://localhost:4010/api/assistant/message \
  -H 'content-type: application/json' \
  -d '{"message":"Jarvis, create a study plan for my exams"}'
```
