# OAMS — Claude Working Instructions

## Project Overview
**OAMS (Office Automation Management System)** is a capstone project for Pamantasan ng Cabuyao. It digitizes administrative workflows (queuing, appointments, document requests, announcements) across 6 college departments (CBAA, COED, COE, CCS, CAS, CHAS) for 4 user roles: Student, Faculty/Professor, College Office Admin, and Administrator.

## Tech Stack
| Layer | Technology |
|---|---|
| Web Frontend | React.js + Vite |
| Mobile App | React Native + Expo (not started yet) |
| Backend | Node.js + Express.js |
| Database | MySQL 8.0 (via Docker) |
| Auth | JWT or session-based + external university identity microservice |
| Password Hashing | bcrypt |
| Real-time | WebSockets or REST polling (decided per feature) |
| AI Layer | Intent classifier API + localized knowledge base microservice |

## Repository Structure
```
CAPSTONE-OAMS/
├── client/           # React + Vite web frontend
├── client-mobile/    # React Native + Expo — NOT started yet, ignore unless asked
├── server/           # Node.js + Express backend
├── docker-compose.yml
└── package.json
```

**client/src layout:** `components/`, `context/`, `contexts/`, `data/`, `pages/` (admin/ professor/ student/), `utils/`
**server layout:** `controllers/`, `db/`, `middleware/`, `routes/`, `db.js`, `server.js`, `oams_db.sql`

---

## Rule 1: Always read before writing
Before touching any file, read its current contents. Never assume what's already there. Check related files (context, routes, controllers) before making changes that could break dependencies.

## Rule 2: Challenge the direction
Think critically. If a proposed approach isn't the most efficient path, say so and suggest a better alternative. Don't just execute — push back when there's a faster, cleaner, or more architecturally sound way to reach the goal.

## Rule 3: Keep context lean
Always look for ways to reduce redundancy. If two files do the same thing, flag it. Remove or consolidate unnecessary files. Keep things simple — avoid over-engineering.

## Rule 4: Never break auth or routing
`AuthContext.tsx`, `ProtectedRoute.tsx`, `authMiddleware.js` are critical. Any change near these files must be explicitly reasoned and discussed before implementing.

## Rule 5: Scope awareness
- `client-mobile/` is out of scope until web parity is reached — do not generate mobile code unless explicitly asked
- AI/chatbot layer does not exist yet — do not fabricate integration code for it
- Mock data is CCS-scoped (`ccs_mock_data.sql`) — do not assume all 6 colleges are wired up
