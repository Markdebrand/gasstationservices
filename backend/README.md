# HSO Fuel Delivery - MVP

This is a minimal FastAPI backend scaffold for a Gas Station Delivery MVP.

Features:
- Auth with OAuth2 password flow + JWT
- Users CRUD (admin-only for listing/creation)
- Stations listing and creation (admin-only)
- Orders creation by users and status updates by admin
- SQLite (async) via SQLAlchemy 2.0

## Quickstart

1. Create a virtualenv and install deps

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r backend/requirements.txt
```

2. Run the API

```powershell
uvicorn app.main:app --reload --port 8000 --app-dir backend
```

3. Open docs at http://127.0.0.1:8000/docs

4. First-time setup: create an admin user directly via the register endpoint then toggle admin in DB if needed.

Env vars (.env):
- DATABASE_URL (default sqlite+aiosqlite:///./app.db)
- JWT_SECRET_KEY
- ACCESS_TOKEN_EXPIRE_MINUTES

This scaffold can be extended to match the PDF spec: roles, delivery tracking, pricing, notifications, etc.
