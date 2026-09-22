# CodePrep - Study Planner Build

This build adds the next product system on top of the existing CodePrep MVP:

## Study Planner

- reusable study tasks stored inside the existing progress state
- subject/topic linking for each task
- due date and optional time
- task types: Study, Learn, Practice, Revision, Interview
- Today / Overdue / Upcoming sections
- mark tasks complete/incomplete
- delete tasks
- clear completed tasks
- one-click `Plan next topic` that creates Learn + Practice tasks for the current roadmap target
- dashboard summary and today's task preview
- planner data participates in the existing localStorage + MongoDB cloud-sync flow

## Run

```bash
npm install
npm run build
npm run dev
```

Backend remains the existing Express/MongoDB service:

```bash
cd server
npm install
npm run dev
```

Planner tasks are stored as part of the existing authenticated progress document, so no new backend collection is required for this MVP.

## Verification note

This source package was updated in the working container, but a Vite production build was not run here because dependencies are not installed in the extracted project. Run `npm install` and `npm run build` on the Windows/Codex environment.


## Final UI Polish Build
- Responsive sidebar drawer for mobile/tablet widths
- Mobile-friendly topbar and user controls
- Demo-vs-cloud content catalog indicator
- Global error boundary with recovery action
- Friendly 404 page instead of silently redirecting unknown routes
- Improved loading state
- Keyboard focus-visible styles
