# Lightweight React + Express + MongoDB Monolithic Task Tracker

This project provides a modern full-stack template for a Task Tracker app, featuring a clean UI in React, a secure Express backend, and MongoDB for persistent data storage, all within a single monorepo.

```
project-root/
  TaskTrackerMonolithicApplication/
    backend/     <-- Express.js (API, Mongo/Mongoose, Auth, Notifications)
    frontend/    <-- React SPA (UI, state mgmt)
    shared/      <-- Shared modules/constants for frontend+backend
```

## Features

- **Full Stack**: Unified monorepo with React (frontend), Express (backend), MongoDB
- **Modern UI**: Clean, responsive design with KAVIA brand styling
- **Task Management**: Authentication, task CRUD, filtering, due notifications
- **Fast**: Minimal dependencies for quick loading times
- **Cross-Platform**: Designed for desktop and iPhone browser compatibility

## Getting Started

### Backend

```sh
cd backend
npm install
npm run dev
```
Requires a MongoDB connection string in `.env` as `MONGODB_URI`.

### Frontend

```sh
npm install
npm start
```

### Shared Code

Put shared code (e.g., validation, schemas, constants) in `/shared`.

## Customization

- **Components**: See `src/App.css` for base styles
- **Backend**: See `/backend/server.js` for Express server
- **Environment Variables**: Set in `.env` files for frontend and backend

All remaining React-specific documentation from the original template applies as well (see below).

