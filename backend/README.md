# Odoo CRM FastAPI with Python

This backend connects to an Odoo instance via XML-RPC and exposes REST endpoints for contacts, clients, and leads, ready to be consumed by a React frontend or any other client.

## Features
- Connects to Odoo using XML-RPC
- Exposes `/crm/clients`, `/crm/contacts`, `/crm/leads`, `/crm/activities` endpoints
- Data normalization for robust API responses
- Pydantic models for data validation
- CORS enabled for frontend integration

## Requirements
- Python 3.10+
- Access to an Odoo instance (with API credentials)

## Installation

1. **Clone the repository**

2. **Create and activate a virtual environment**
   python -m venv env
   source env/bin/activate  # On Windows: env\Scripts\activate


3. **Install dependencies**
   pip install -r requirements.txt
 

4. **Configure environment variables**
   Create a `.env` file in the backend root with:
   ```env
   ODOO_URL=https://your-odoo-server.com
   ODOO_DB=your_db_name
   ODOO_USER=your_user
   ODOO_PASSWORD=your_password
   ```

## Running the Backend

From the backend root directory, run: uvicorn app.main:app --reload

The API will be available at `http://localhost:8000`.

## API Endpoints

- `GET /crm/clients`   → List all clients (Odoo customers)
- `GET /crm/contacts`  → List all contacts (Odoo partners)
- `GET /crm/leads`     → List all leads (Odoo opportunities)
- `GET /crm/activities`     → List all activies (Odoo activities)

## Notes
- Make sure your Odoo instance is accessible from the backend server.
- The backend normalizes data to avoid validation errors (e.g., converts `False` to `None` or `[]` as needed).
- For production, adjust CORS and security settings as required.

## Deployment (Ubuntu + Nginx + Gunicorn)

1. System deps
   sudo apt update && sudo apt install -y python3 python3-venv python3-pip git nginx

2. Virtualenv
   python3 -m venv env && source env/bin/activate

3. Install
   pip install --upgrade pip && pip install -r requirements.txt gunicorn uvicorn

4. .env
   cp .env.example .env  # y rellena valores

5. Test locally
   gunicorn -c gunicorn.conf.py app.main:app

6. systemd (ejemplo)
   /etc/systemd/system/fastapi-backend.service
   [Unit]\nDescription=FastAPI backend\nAfter=network.target\n\n[Service]\nUser=www-data\nGroup=www-data\nWorkingDirectory=/ruta/a/backend\nEnvironmentFile=/ruta/a/backend/.env\nExecStart=/ruta/a/backend/env/bin/gunicorn -c /ruta/a/backend/gunicorn.conf.py app.main:app\n\n[Install]\nWantedBy=multi-user.target

7. Nginx (ejemplo)
   /etc/nginx/sites-available/fastapi-backend
   server {\n  listen 80;\n  server_name tu-dominio.com;\n  location / {\n    proxy_pass http://127.0.0.1:8000;\n    proxy_set_header Host $host;\n    proxy_set_header X-Real-IP $remote_addr;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    proxy_set_header X-Forwarded-Proto $scheme;\n  }\n}

8. Enable
   sudo ln -s /etc/nginx/sites-available/fastapi-backend /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx

9. TLS
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d tu-dominio.com

## Autenticación y sesiones

El backend emite JWT de acceso de corta duración y refresh tokens persistentes por dispositivo.

Endpoints:
- POST /auth/login { email, password } -> { access_token, token_type, refresh_token }
- POST /auth/refresh { refresh_token } -> { access_token, refresh_token }
- POST /auth/logout { refresh_token? }
- GET /auth/me
- GET /whoami (requiere Authorization: Bearer)
- GET /admin/ping (requiere rol admin)

Nota:
- El registro de usuarios está deshabilitado en esta versión (no existe `/auth/register`). El alta de usuarios se gestiona fuera del flujo público.

Seeding automático:
- Planes base (incluye "started").
- Usuario admin admin@example.com / Admin123! y organización "HSO Admin".

## Contact Sales (email → Odoo CRM)

Las solicitudes del formulario de Contact Sales se envían por correo a `webform@hsotrade.com`, donde son ingeridas automáticamente por el CRM de Odoo. No se persisten en base de datos.

- Endpoint principal: `POST /contact/submit` (usa el adaptador SMTP y respeta `EMAIL_TO`).
- Recomendado: configurar `EMAIL_TO=webform@hsotrade.com` en el entorno para que cada envío caiga en Odoo CRM.
- Endpoint alterno sencillo: `POST /contact-us` (router minimalista), orientado a sitios muy simples; por defecto envía a `support@hsotrade.com`.

Variables de entorno relevantes (ejemplo):

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=info@hsotrade.com
SMTP_PASSWORD=********
SMTP_TLS=true
SMTP_SSL=false
EMAIL_SENDER=info@hsotrade.com
EMAIL_TO=webform@hsotrade.com
# Opcional: varias separadas por coma
SMTP_CC=ops@hsotrade.com, sales@hsotrade.com
```

Comportamiento:
- Remitente: `SMTP_USER`/`EMAIL_SENDER`.
- Destinatarios: `EMAIL_TO` (lista separada por comas). Para Odoo CRM, usar `webform@hsotrade.com`.
- Se envía un acuse de recibo de prueba al correo del usuario (si el adaptador lo permite); fallos en ese envío no bloquean la operación principal.