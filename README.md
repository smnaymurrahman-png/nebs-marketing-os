# Nebs Marketing OS

All-in-one marketing team management platform for **Nebs IT Solution Ltd**.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Backend | Node.js + Express |
| Database | MySQL |
| Auth | JWT + bcrypt |
| Styling | Tailwind CSS + Sora font |
| State | Zustand (persist) |
| Email | Nodemailer (SendGrid/SMTP) |

---

## 📁 Project Structure

```
nebs-marketing-os/
├── backend/                  # Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js   # MySQL connection pool
│   │   │   ├── migrate.js    # Run: npm run migrate
│   │   │   └── seed.js       # Run: npm run seed
│   │   ├── controllers/      # Business logic
│   │   ├── middleware/       # Auth, error handler
│   │   ├── routes/           # API endpoints
│   │   └── utils/            # Email, notifications
│   ├── .env.example
│   └── package.json
│
└── frontend/                 # Next.js app
    ├── src/
    │   ├── app/
    │   │   ├── auth/         # Login, forgot password
    │   │   └── dashboard/    # All dashboard pages
    │   ├── components/
    │   │   └── layout/       # Sidebar, TopBar
    │   └── lib/
    │       ├── api.ts        # Axios client
    │       ├── store.ts      # Zustand auth store
    │       └── utils.ts      # Helpers, formatters
    └── package.json
```

---

## 🚀 Setup Guide

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

---

### Step 1 — MySQL Database Setup

```sql
CREATE DATABASE nebs_marketing_os CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

### Step 2 — Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials and email settings
npm install
npm run migrate    # Creates all tables
npm run seed       # Creates default users
npm run dev        # Starts on http://localhost:5000
```

**Default accounts after seeding:**

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@nebsit.com | Admin@1234 |
| Admin | admin@nebsit.com | Admin@1234 |
| Designer | designer@nebsit.com | User@1234 |
| Copywriter | copy@nebsit.com | User@1234 |
| Social Media | social@nebsit.com | User@1234 |

---

### Step 3 — Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
# Edit NEXT_PUBLIC_API_URL if your backend isn't on localhost:5000
npm install
npm run dev        # Starts on http://localhost:3000
```

---

### Step 4 — Open the app

Visit **http://localhost:3000** and log in with any of the default accounts above.

---

## 🔑 API Endpoints (Part 1 — Foundation)

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login with email + password |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/forgot-password | Send reset email |
| POST | /api/auth/reset-password | Reset password with token |
| PUT | /api/auth/change-password | Change own password |

### Users (Super Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | List all members |
| POST | /api/users | Create member |
| PUT | /api/users/:id | Update member |
| DELETE | /api/users/:id | Delete member |
| POST | /api/users/:id/reset-password | Reset member's password |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | List tasks (filtered by role) |
| GET | /api/tasks/my-tasks | Personal task/checklist view |
| GET | /api/tasks/stats | Dashboard stats |
| GET | /api/tasks/:id | Single task with all details |
| POST | /api/tasks | Create task (admin+) |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task (admin+) |
| POST | /api/tasks/:id/comments | Add comment |
| PUT | /api/tasks/:id/checklist/:checkId | Toggle checklist item |
| POST | /api/tasks/:id/files | Upload file |
| PUT | /api/tasks/:taskId/files/:fileId/review | Accept/reject file (admin) |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications | Get notifications + unread count |
| PUT | /api/notifications/mark-all-read | Mark all read |
| PUT | /api/notifications/:id/read | Mark one read |

---

## 📦 What's Built (Part 1 — Foundation)

✅ Authentication system (login, logout, forgot password, reset password)
✅ JWT-based auth with 7-day token persistence
✅ Role-based access control (Super Admin / Admin / User)
✅ Member management CRUD (Super Admin only)
✅ Dashboard with task stats and pipeline visualization
✅ Task board with filtering (status, priority, search)
✅ Task pipeline: New → To Do → Ongoing → In Review → In Revision → Approved → Posted
✅ My Tasks personal view with checklist toggle
✅ File upload + admin review (accept/reject)
✅ In-app notifications with unread count
✅ Email notifications (task assigned, reviewed, etc.)
✅ Responsive sidebar navigation with role-based menu
✅ Real-time notification polling (every 30s)

---

## 🔜 Coming in Next Parts

- **Part 2:** Full task detail page, create task form, checklist sub-assignment UI
- **Part 3:** Shared calendar, Ideation Center, Meeting Center
- **Part 4:** Ads report, content performance report, task completion analytics

---

## 🌐 Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nebs_marketing_os
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@nebsit.com
FRONTEND_URL=http://localhost:3000
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=Nebs Marketing OS
```
