
# FirmFlow 360 — Practice Management Platform for CA Firms

![Status](https://img.shields.io/badge/Status-In%20Progress-yellow)
![Stack](https://img.shields.io/badge/Stack-MERN-blue)
![Auth](https://img.shields.io/badge/Auth-JWT%20%7C%20OAuth-green)

A full-stack business workflow platform built for Chartered Accountant firms — replacing manual processes (Excel sheets, WhatsApp messages, physical files) with a centralised, role-based management system.

---

## 🚀 Features

- **Role-Based Access Control (RBAC)** — 3 roles: Admin, Staff, Client
- **JWT Authentication** — secure login and protected routes
- **Assignment Management** — create, assign, track, and close assignments
- **Client Onboarding** — manage client profiles and documents
- **Staff Management** — track staff activity and task progress
- **Document Handling** — upload and manage client documents
- **Real-Time Dashboards** — track 5+ metrics: assignments, tasks, staff activity, document status
- **Notification System** — alerts for assignment updates and deadlines

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, HTML5, CSS3 |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose ODM |
| Auth | JWT, bcrypt |
| API Testing | Postman |
| Version Control | Git, GitHub |

---

## 📁 Project Structure

```
firmflow-360/
├── client/                 # React.js frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Role-based page views
│   │   └── utils/          # Auth helpers, API calls
├── server/                 # Node.js + Express backend
│   ├── controllers/        # Route controllers
│   ├── models/             # Mongoose schemas
│   ├── routes/             # REST API routes
│   └── middleware/         # Auth middleware (JWT)
└── README.md
```

---

## 🔐 Roles & Permissions

| Feature | Admin | Staff | Client |
|---------|-------|-------|--------|
| Manage Staff | ✅ | ❌ | ❌ |
| Manage Clients | ✅ | ✅ | ❌ |
| Create Assignments | ✅ | ✅ | ❌ |
| View Own Assignments | ✅ | ✅ | ✅ |
| Upload Documents | ✅ | ✅ | ✅ |
| View Dashboard | ✅ | ✅ | ❌ |

---

## 📡 API Overview

| Module | Endpoints | Description |
|--------|-----------|-------------|
| Auth | 3 | Login, register, token refresh |
| Users | 4 | Admin, staff, client CRUD |
| Assignments | 5 | Create, assign, update, close |
| Documents | 3 | Upload, fetch, delete |
| Dashboard | 2 | Metrics and activity feed |

15+ REST endpoints across 6 MongoDB collections with full CRUD support.

---

## ⚙️ Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- npm

### Installation

```bash
# Clone the repo
git clone https://github.com/ruhani11/firmflow360.git
cd firmflow-360

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Environment Variables

Create a `.env` file in `/server`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### Run the App

```bash
# Run backend (from /server)
npm run dev

# Run frontend (from /client)
npm start
```

---

## 🗺️ Roadmap

- [x] JWT Authentication + RBAC
- [x] Client & Staff Management
- [x] Assignment Tracking
- [x] Document Handling
- [x] Role-based Dashboards
- [ ] Email Notifications
- [ ] Invoice Generation
- [ ] Mobile Responsive UI
- [ ] Deployment (Vercel + Render)

---

## 👩‍💻 Author

**Ruhani Bhatia**
- LinkedIn: [linkedin.com/in/ruhani-bhatia-a6753727a](https://linkedin.com/in/ruhani-bhatia-a6753727a)
- GitHub: [github.com/ruhani11](https://github.com/ruhani11)
- Portfolio: [portfolio-ruhani.vercel.app](https://portfolio-ruhani.vercel.app)

---

> ⚠️ This project is currently in active development. Features and structure may change.

