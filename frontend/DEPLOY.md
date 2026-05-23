# Deploy to Firebase Hosting

This project uses **Firebase Hosting with Next.js framework support** (SSR + server actions for Genkit).

## Prerequisites

1. [Node.js](https://nodejs.org/) v20+
2. Firebase project: `project-1d5e56dd-c145-4ed9-9db`
3. Firebase CLI (included as dev dependency)

## One-time setup

### 1. Log in to Firebase

```bash
npx firebase login
```

### 2. Link project (already configured in `.firebaserc`)

```bash
npx firebase use project-1d5e56dd-c145-4ed9-9db
```

### 3. Production environment variables

Create `.env.production` from the example (values are embedded at build time):

```bash
cp .env.production.example .env.production
```

Fill in:

- All `NEXT_PUBLIC_FIREBASE_*` keys (from Firebase Console → Project settings)
- `NEXT_PUBLIC_MAPTILER_API_KEY`
- `NEXT_PUBLIC_BACKEND_URL` — public URL of your Python/FastAPI backend (not `localhost`)

### 4. Firebase Console settings

**Authentication**

- Enable Email/Password and Google
- Add authorized domains: `project-1d5e56dd-c145-4ed9-9db.web.app`, `project-1d5e56dd-c145-4ed9-9db.firebaseapp.com`, and your custom domain if any

**Firestore**

- Deploy security rules appropriate for your app

**Hosting**

- First deploy may enable the Blaze (pay-as-you-go) plan because Next.js SSR uses Cloud Functions/Cloud Run

## Deploy

From the frontend folder:

```bash
npm run deploy
```

Or:

```bash
npx firebase deploy --only hosting
```

Firebase will build Next.js and deploy to:

- `https://project-1d5e56dd-c145-4ed9-9db.web.app`
- `https://project-1d5e56dd-c145-4ed9-9db.firebaseapp.com`

## Preview channel (optional)

```bash
npx firebase hosting:channel:deploy preview --expires 7d
```

## Backend API

The frontend calls your crowd-monitoring API via `NEXT_PUBLIC_BACKEND_URL`. Host the Python backend separately (Cloud Run, VM, etc.) and set CORS to allow your Firebase Hosting domain.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Not logged in` | Run `npx firebase login` |
| Build fails on server actions | Do not use `output: 'export'`; use framework hosting (`firebase.json` `source: "."`) |
| Auth works locally but not hosted | Add hosting domain to Firebase Auth authorized domains |
| API calls fail | Set `NEXT_PUBLIC_BACKEND_URL` and enable CORS on the backend |
