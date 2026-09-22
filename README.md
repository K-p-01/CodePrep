# CodePrep — Complete Project

CodePrep is a roadmap-based placement preparation platform for college students.
It combines structured subject roadmaps, curated resources, short notes, coding practice, MCQs, progress tracking, search, bookmarks/revision, analytics, profile, study planning, authentication, cloud sync, and an admin content studio.

## Current feature set

- Dashboard and subject roadmaps
- DSA, DBMS, OS, CN, OOP, Aptitude, Interview Prep content
- Topic pages with resources, notes, and practice
- Coding practice with external problem links
- Reusable MCQ engine
- Topic/subject/overall progress
- Continue Learning
- Search and filters
- Bookmarks + Revision Hub
- Analytics
- Profile
- Study Planner + reminders/plans
- Authentication (frontend + Express/JWT backend)
- MongoDB-backed user/progress/content APIs
- Cloud progress + bookmark sync
- Admin Content Studio
- Responsive UI, error boundary, 404 page, loading/accessibility polish

## Project structure

```text
CodePrep/
├── src/                  # React/Vite frontend
│   ├── components/       # Reusable UI components
│   ├── data/             # Starter catalog content
│   ├── pages/             # Route-level screens
│   ├── state/             # Auth/content/progress state
│   ├── api.js
│   ├── App.jsx
│   └── main.jsx
├── server/               # Express + MongoDB API
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── server.js
├── index.html
├── package.json
├── vite.config.js
└── .env.example
```

## Frontend setup

From the project root:

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Backend setup

From the project root:

```bash
cd server
npm install
```

Copy `server/.env.example` to `server/.env` and set the MongoDB connection string and JWT secret.

Then start the API:

```bash
npm run dev
```

## Admin

Set `ADMIN_EMAILS` in `server/.env` to the email account(s) that should have admin access.

## Important

The ZIP intentionally excludes `node_modules/` and generated `dist/` output. Install dependencies on the target machine.

## Recommended development order

1. Run the frontend and backend locally.
2. Verify login/register.
3. Verify DSA → Arrays → Practice.
4. Verify DBMS → Normalization → MCQ.
5. Verify progress/bookmark cloud sync after refresh/login.
6. Verify Admin Content Studio.
7. Populate/curate final educational content.
8. Add deployment environment variables and deploy.
