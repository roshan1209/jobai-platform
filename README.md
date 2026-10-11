# JobAI Full-Stack MVP

Next.js + TypeScript frontend, FastAPI backend, MongoDB Atlas. Includes registration/login, JWT auth, roles, profile/skills, recruiter job posting, recommendations, applications, recruiter applicants, and tests.

## MongoDB Atlas
1. Create a cluster at https://www.mongodb.com/atlas.
2. Security > Database Access > create a database user/password.
3. Security > Network Access > add your current IP address.
4. Database > Connect > Drivers > Python; copy the URI.
5. Copy `apps/api/.env.example` to `apps/api/.env`; replace URI and set a long random JWT_SECRET. URL-encode special characters in the DB password. Never commit `.env`.

## Run API (PowerShell)
```powershell
cd apps/api
py -3.11 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```
API docs: http://127.0.0.1:8000/docs

## Run frontend (second terminal)
```powershell
cd apps/web
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```
Open http://localhost:3000. If PowerShell blocks npm.ps1, use `npm.cmd`.

## Roles / first use
Register at `/sign-up` as a recruiter to publish jobs, or as a job seeker to add skills, get recommendations, and apply. Role checks happen in FastAPI. This is a portfolio MVP, not a production-certified recruitment service. Add rate limiting, email verification, password reset, refresh-token rotation, audit monitoring and privacy review before production. JWT is stored in localStorage for starter simplicity; use secure HttpOnly cookies for production.
