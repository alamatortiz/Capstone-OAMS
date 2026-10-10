# OAMS - Office Automation Management System

Capstone project for Pamantasan ng Cabuyao (University of Cabuyao).

A centralized digital platform for college offices handling queue management, appointment scheduling, document processing, and information dissemination across CBAA, COED, COE, CCS, CAS, and CHAS.

---

## Prerequisites

Install these on your machine before starting:

| Tool | Download Link | Purpose |
|------|--------------|---------|
| **Node.js** (LTS) | [nodejs.org](https://nodejs.org) | JavaScript runtime |
| **Git** | [git-scm.com](https://git-scm.com) | Version control |
| **MySQL** | [mysql.com](https://mysql.com) or use **XAMPP** | Database server |
| **VS Code** | [code.visualstudio.com](https://code.visualstudio.com) | Code editor |

Verify installations:
```bash
node -v       # Should show v20.x.x or higher
npm -v        # Should show 10.x.x or higher
git --version
mysql --version
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/your-org/Capstone-OAMS.git
cd Capstone-OAMS
```

---

## 2. Database Setup

1. Start MySQL (or XAMPP MySQL service).
2. Open your MySQL client (MySQL Workbench, phpMyAdmin, or terminal).
3. Run the schema file:

```sql
-- In MySQL Workbench or terminal
SOURCE server/oams_db.sql;
```

Or via command line:
```bash
mysql -u root -p < server/oams_db.sql
```

4. Verify the database exists:
```sql
SHOW DATABASES;  -- Should show "oams_db"
USE oams_db;
SHOW TABLES;     -- Should show all OAMS tables
```

---

## 3. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your MySQL credentials
# Windows: notepad .env
# Mac/Linux: nano .env
```

**Example `.env`:**
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=oams_db
```

**Start the server:**
```bash
# Development (auto-restart on file changes)
npm run dev

# OR production mode
npm start
```

Server runs at `http://localhost:5000`

Test it: open browser to `http://localhost:5000/api/health`

---

## 4. Web Frontend Setup

Open a **new terminal** (keep the server running):

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

Web app runs at `http://localhost:5173`

The Vite dev server automatically proxies `/api` calls to `http://localhost:5000`.

---

## 5. Mobile App Setup (React Native + Expo)

Open a **new terminal**:

```bash
cd client-mobile

# Install dependencies
npm install

# Install Expo CLI globally (if not already)
npm install -g expo-cli

# Start Expo development server
npx expo start
```

**Run on your phone:**
1. Install **Expo Go** app from Play Store / App Store.
2. Scan the QR code shown in terminal with your phone camera.
3. The app loads on your device.

**Important:** Your phone and computer must be on the **same WiFi network**.

**Update the API IP:** In `client-mobile/App.js`, replace the IP with your computer's local IP:
```javascript
const API = 'http://192.168.1.100:5000/api';  // Your actual IP here
```

Find your IP:
- Windows: `ipconfig` → look for `IPv4 Address`
- Mac: `ifconfig | grep inet`
- Linux: `ip addr`

---

## Project Structure

```
Capstone-OAMS/
├── client/                 # React web frontend (Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level pages
│   │   └── App.jsx         # Root component
│   ├── .env                # API URL config
│   └── package.json
│
├── client-mobile/          # React Native mobile app (Expo)
│   ├── App.js              # Root component
│   └── package.json
│
├── server/                 # Express.js backend API
│   ├── server.js           # Main server entry
│   ├── db.js               # MySQL connection pool
│   ├── oams_db.sql         # Database schema
│   ├── .env                # Environment variables
│   └── package.json
│
├── .gitignore              # Git exclusions
└── README.md               # This file
```

---

## Common Issues

### `npm install` fails with permission errors
```bash
# Windows: Run terminal as Administrator
# Mac/Linux:
sudo npm install -g expo-cli
```

### MySQL connection refused
- Make sure MySQL service is running.
- Check `.env` credentials match your MySQL setup.
- Default XAMPP MySQL has no password (leave `DB_PASSWORD` empty).

### Mobile app shows "Network Error"
- Phone and computer must be on **same WiFi**.
- Check firewall isn't blocking port 5000.
- Verify the IP address in `App.js` matches your computer's IP.

### Port already in use
```bash
# Kill process on port 5000 (server)
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

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend (Web) | React 18, Vite, Axios |
| Frontend (Mobile) | React Native, Expo |
| Backend | Node.js, Express.js |
| Database | MySQL 8 |
| API Style | RESTful JSON |

---

## Team

- Ortiz, Alvin Matthew Q.
- Recio, Joaquin Aaron P.
- Rosales, Luiz Gabriel S.

**Institution:** Pamantasan ng Cabuyao (University of Cabuyao)  
**Program:** Bachelor of Science in Information Technology  
**Year:** 2025-2026
