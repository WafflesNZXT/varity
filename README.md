# Varity

Varity is a professional AI SaaS-style workspace built with Next.js, Neon Postgres, and Gemini.

## Features

- Sign up + login with credentials
- Session-based auth powered by NextAuth
- SaaS dashboard UI with left nav (chats, search, settings, account)
- Persistent per-user chats stored in Neon (`profiles`, `chats`)
- Gemini-backed response generation through `/api/chat`

## 1) Install and run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## 2) Add environment variables

Copy `.env.example` to `.env.local` and fill in:

- `DATABASE_URL`: Neon Postgres connection string
- `NEXTAUTH_SECRET`: long random string used to sign sessions
- `NEXTAUTH_URL`: app URL (use `http://localhost:3000` in local dev)
- `GEMINI_API_KEY`: create in Google AI Studio
- `GEMINI_MODEL`: optional (default is `gemini-2.0-flash`)

## 3) Database tables

The app auto-creates required tables on first API request if they do not exist:

- `profiles` (email/password hash/user metadata)
- `chats` (chat title + JSON message history per user)

No extra migration step is required for local MVP usage.

## 4) Where API keys come from

- Gemini key: `https://aistudio.google.com/app/apikey`
- Neon DB: Neon dashboard → project connection string

## 5) App flow

- Open `/` to sign up or log in
- After auth, users are redirected to `/chat`
- Sidebar provides:
	- `Your Chats`
	- `Search Chats`
	- `Settings`
	- Account block at the bottom with logout
- Every message is sent to Gemini and persisted to the authenticated user’s chat history

