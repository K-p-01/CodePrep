# CodePrep Backend Setup

## 1. Backend dependencies

From `CODEPREP/server`:

```bash
npm install
```

## 2. Configure MongoDB

Copy `server/.env.example` to `server/.env` and set:

- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_ORIGIN`

Example local MongoDB URI:

```text
mongodb://127.0.0.1:27017/codeprep
```

## 3. Start API

```bash
cd server
npm run dev
```

API:

```text
http://127.0.0.1:5000/api
```

Health check:

```text
GET /api/health
```

Auth endpoints:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

## 4. Start frontend

From the root:

```bash
npm install
npm run dev
```

The frontend defaults to `http://127.0.0.1:5000/api` for API calls. Override with `VITE_API_URL` when needed.

## Current architecture

- React/Vite frontend
- Express API
- MongoDB via Mongoose
- JWT authentication
- Passwords hashed with bcryptjs
- Existing roadmap/practice/bookmark progress remains in localStorage for this stage

The next backend step is to synchronize progress/bookmarks with authenticated user documents so the same account can resume preparation on another device.

### Progress API

Authenticated progress endpoints:

- `GET /api/progress` → returns the current user's progress payload.
- `PUT /api/progress` with `{ "progress": { ... } }` → replaces the current user's progress payload.

The frontend keeps a local copy for resilience and synchronizes it to MongoDB after login. Changes are debounced before being saved remotely.

## Content Studio (Admin)

The app now includes a MongoDB-backed content catalog and an admin-only Content Studio.

Add one or more comma-separated admin emails to `server/.env`:

```text
ADMIN_EMAILS=you@example.com,another@example.com
```

Log in with an account using one of those emails. The account is assigned the `admin` role and the sidebar shows **Content Studio**.

Admin content endpoints:

- `GET /api/content` → returns the current catalog. If nothing has been published to MongoDB yet, the built-in `src/data/subjects.js` catalog is returned as a fallback.
- `POST /api/content/seed` → copies the built-in catalog into MongoDB.
- `PUT /api/content` with `{ "subjects": [...] }` → publishes the edited catalog to MongoDB.

The frontend now reads subjects, topics, resources, notes, and practice from the content API with the built-in catalog as a fallback, so changes published from Content Studio appear in the student experience without editing source files.
