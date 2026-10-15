# OAMS - Office Automation Management System

Capstone project for Pamantasan ng Cabuyao (University of Cabuyao).

A centralized digital platform for college offices handling queue management, appointment scheduling, document processing, and information dissemination across CBAA, COED, COE, CCS, CAS, and CHAS.

**Live website:** https://capstone-oams-ucpnc.onrender.com
**Live API:** https://capstone-oams-uc.onrender.com/api

> The apps above run on Render's free tier and spin down after inactivity — the first request after a while can take 30-60s to wake up.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | React 19, Vite, React Router, Axios, Socket.IO client |
| Mobile App | React Native + Expo (Expo Router), 3 role-locked builds (Student / Faculty / Admin) |
| Backend | Node.js, Express 5, Socket.IO |
| Database | MySQL 8 (local dev) / TiDB Cloud Serverless (production) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Push Notifications | web-push (VAPID) + Expo push (mobile) |
| Testing | Jest (server), Vitest (client) |

---

## Prerequisites

Install these on your machine before starting:

| Tool | Download Link | Purpose |
|------|--------------|---------|
| **Node.js** (LTS, v20+) | [nodejs.org](https://nodejs.org) | JavaScript runtime |
| **Git** | [git-scm.com](https://git-scm.com) | Version control |
| **Docker Desktop** | [docker.com](https://www.docker.com/products/docker-desktop) | Easiest way to run the local database |
| **VS Code** | [code.visualstudio.com](https://code.visualstudio.com) | Code editor |

Verify installations:
```bash
node -v       # Should show v20.x.x or higher
npm -v
git --version
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/alamatortiz/Capstone-OAMS.git
cd Capstone-OAMS
```

---

## Quick Start (Docker)

The fastest way to get the web app + database running locally. This spins up MySQL, the backend, and the web frontend together, already wired to talk to each other.

```bash
docker compose up
```

- Web app: `http://localhost:5173`
- API: `http://localhost:5000/api`
- MySQL: `localhost:3306` (schema and mock data load automatically on first run)

On Windows, if Docker refuses to bind port 5000 ("ports are not available"), it's usually `winnat` reserving that range — remap the port locally (see `docker-compose.override.yml`, which is gitignored) instead of changing the committed file.

The sections below cover running each piece manually instead, and setting up the mobile app (which isn't part of the Docker stack).

---

## 2. Database Setup (manual, if not using Docker)

1. Start MySQL (or XAMPP MySQL service).
2. Open your MySQL client (MySQL Workbench, phpMyAdmin, or terminal).
3. Run the schema file:

```bash
mysql -u root -p < server/oams_db.sql
```

4. Optionally load the CCS mock data (sample accounts, services, documents):
```bash
mysql -u root -p oams_db < server/db/mock/ccs_mock_data.sql
```

5. Verify:
```sql
SHOW DATABASES;  -- Should show "oams_db"
USE oams_db;
SHOW TABLES;
```

---

## 3. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in `server/` (there's no `.env.example` committed — copy these keys):

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=oams_db
JWT_SECRET=some_long_random_string
JWT_EXPIRES_IN=24h
CLIENT_ORIGINS=http://localhost:5173
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
```

`VAPID_*` keys are only needed for web push notifications — generate a pair with `npx web-push generate-vapid-keys` if you want that feature working locally.

**Start the server:**
```bash
npm run dev     # same as npm start -- there's no file-watcher, restart manually after changes
```

Server runs at `http://localhost:5000`.

**Run the server test suite:**
```bash
npm test
```

---

## 4. Web Frontend Setup

Open a **new terminal**:

```bash
cd client
npm install
```

Create a `.env` file in `client/`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_VAPID_PUBLIC_KEY=
```

(`VITE_VAPID_PUBLIC_KEY` should match the server's `VAPID_PUBLIC_KEY` if you set one up.)

```bash
npm run dev
```

Web app runs at `http://localhost:5173`.

---

## 5. Mobile App Setup (React Native + Expo)

Open a **new terminal**:

```bash
cd client-mobile
npm install
```

Copy `.env.example` to `.env` and set your machine's **LAN IP** (not `localhost` — a physical phone can't reach that):
```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:5000/api
```

Find your IP:
- Windows: `ipconfig` → `IPv4 Address`
- Mac: `ifconfig | grep inet`
- Linux: `ip addr`

```bash
npx expo start
```

1. Install **Expo Go** on your phone.
2. Scan the QR code shown in the terminal.
3. Phone and computer must be on the **same WiFi network**.

Run this way (no `APP_VARIANT` set), the app opens as the combined build with every role — fine for local development. Production ships as three separate installs (`OAMS Student`, `OAMS Faculty`, `OAMS Admin`) built via EAS with `APP_VARIANT=student|faculty|admin`, each locked to its own role and Android package name.

---

## Project Structure

```
Capstone-OAMS/
├── client/                 # React web frontend (Vite)
│   └── src/
│       ├── components/
│       ├── context/        # Auth, theme, etc.
│       ├── pages/           # admin/ professor/ student/
│       └── utils/
│
├── client-mobile/          # React Native app (Expo Router), 3 role-locked variants
│   └── app/
│
├── server/                 # Express.js backend API
│   ├── controllers/
│   ├── routes/
│   ├── jobs/                # automated sweepers (reminders, no-show voiding, etc.)
│   ├── middleware/
│   ├── utils/
│   ├── db/
│   │   ├── migrations/
│   │   └── mock/             # CCS-scoped sample data
│   ├── server.js
│   ├── db.js
│   └── oams_db.sql           # full schema
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Common Issues

### `npm install` fails with permission errors
```bash
# Windows: run the terminal as Administrator
# Mac/Linux:
sudo npm install
```

### MySQL connection refused
- Make sure MySQL (or the Docker `db` service) is running.
- Check `.env` credentials match your MySQL setup.
- Default XAMPP MySQL has no password (leave `DB_PASSWORD` empty).

### Mobile app shows "Network Error"
- Phone and computer must be on the **same WiFi**.
- Check your firewall isn't blocking port 5000.
- Confirm `EXPO_PUBLIC_API_URL` in `client-mobile/.env` is your LAN IP, not `localhost`.

### Port already in use
```bash
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:5000 | xargs kill -9
```

---

## Git Workflow

```bash
# Pull latest changes before starting work
git pull origin main

# Create a feature branch
git checkout -b feature/your-feature-name

# Stage and commit your changes
git add .
git commit -m "feat: description of what you changed"

# Push to remote
git push origin feature/your-feature-name

# Create a Pull Request on GitHub for review
```

---

## Team

- Ortiz, Alvin Matthew Q.
- Recio, Joaquin Aaron P.
- Rosales, Luiz Gabriel S.

**Institution:** Pamantasan ng Cabuyao (University of Cabuyao)
**Program:** Bachelor of Science in Information Technology
**Year:** 2025-2026
