import os, sqlite3, threading, json
from cryptography.fernet import Fernet
from typing import Optional, List, Dict, Any

# ORM for persistent user-bound tokens
from app.db.database import SessionLocal
from app.db import models as m

_CUR_DIR = os.path.dirname(__file__)
_OLD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "plaid")


def _resolve_path(env_name: str, default_filename: str) -> str:
    """Permite override por env; si no hay, usa nueva ruta; si no existe, intenta la antigua."""
    p = os.getenv(env_name)
    if p:
        return p
    new_p = os.path.join(_CUR_DIR, default_filename)
    if os.path.exists(new_p):
        return new_p
    old_p = os.path.join(_OLD_DIR, default_filename)
    return old_p


_DB_PATH = _resolve_path("PLAID_DB_PATH", "plaid.sqlite")
_KEY_PATH = _resolve_path("PLAID_KEY_PATH", "plaid.key")
_ENV_KEY = os.getenv("PLAID_ENC_KEY")  # base64 fernet key
_lock = threading.Lock()


def _get_cipher() -> Fernet:
    # Prefer environment variable
    if _ENV_KEY:
        try:
            return Fernet(_ENV_KEY.encode())
        except Exception as e:
            raise RuntimeError("Invalid PLAID_ENC_KEY provided; must be a Fernet base64 key") from e
    # Fallback to file if exists
    if os.path.exists(_KEY_PATH):
        with open(_KEY_PATH, 'rb') as f:
            key = f.read()
        return Fernet(key)
    # Last resort: generate and persist to file for stability across restarts
    key = Fernet.generate_key()
    try:
        # Ensure folder exists
        os.makedirs(os.path.dirname(_KEY_PATH), exist_ok=True)
        with open(_KEY_PATH, 'wb') as f:
            f.write(key)
    except Exception:
        # If writing fails, we still return an in-memory key (tokens won't survive restart)
        pass
    return Fernet(key)


def _get_conn():
    conn = sqlite3.connect(_DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def init_db():
    """Initialize storage backends.

    - Ensure SQLite tables for transfer tracking exist (kept for lightweight webhooks).
    - Ensure SQLAlchemy metadata includes PlaidItem (created by main DB init already).
    """
    with _lock:
        # SQLite for transfer tracking
        conn = _get_conn()
        try:
            conn.execute(
                """CREATE TABLE IF NOT EXISTS plaid_transfers (
                transfer_id TEXT PRIMARY KEY,
                status TEXT,
                last_payload TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )"""
            )
            conn.execute(
                """CREATE TABLE IF NOT EXISTS plaid_transfer_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transfer_id TEXT,
                event_type TEXT,
                webhook_type TEXT,
                webhook_code TEXT,
                payload TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )"""
            )
            conn.commit()
        finally:
            conn.close()


def save_access_token(user_id: str, item_id: str, access_token: str, institution_name: str | None = None):
    """Persist encrypted Plaid access token bound to a user in MySQL via ORM."""
    cipher = _get_cipher()
    enc = cipher.encrypt(access_token.encode())
    with SessionLocal() as db:
        # If same user+item exists, update; else insert
        existing = (
            db.query(m.PlaidItem)
            .filter(m.PlaidItem.user_id == int(user_id), m.PlaidItem.item_id == item_id)
            .one_or_none()
        )
        if existing:
            # Use setattr to avoid static type analysis issues
            setattr(existing, "access_token_enc", enc)
            if institution_name:
                setattr(existing, "institution_name", institution_name)
        else:
            db.add(
                m.PlaidItem(
                    user_id=int(user_id),
                    item_id=item_id,
                    access_token_enc=enc,
                    institution_name=institution_name,
                )
            )
        db.commit()


def latest_access_token(user_id: str) -> Optional[str]:
    """Return latest decrypted access token for a user from MySQL."""
    cipher = _get_cipher()
    with SessionLocal() as db:
        row = (
            db.query(m.PlaidItem.access_token_enc)
            .filter(m.PlaidItem.user_id == int(user_id))
            .order_by(m.PlaidItem.id.desc())
            .first()
        )
        if not row:
            return None
        enc = row[0]
        try:
            return cipher.decrypt(enc).decode()
        except Exception:
            return None


def list_items(user_id: str) -> List[Dict]:
    """List linked Plaid items for a user from MySQL (no tokens returned)."""
    with SessionLocal() as db:
        rows: List[m.PlaidItem] = (
            db.query(m.PlaidItem)
            .filter(m.PlaidItem.user_id == int(user_id))
            .order_by(m.PlaidItem.id.desc())
            .all()
        )
        result: List[Dict] = []
        for r in rows:
            created = getattr(r, "created_at", None)
            created_s = created.isoformat() if created is not None else None
            result.append(
                {
                    "id": r.id,
                    "item_id": r.item_id,
                    "institution_name": r.institution_name,
                    "created_at": created_s,
                }
            )
        return result


def upsert_transfer_status(transfer_id: str, status: Optional[str], payload: Dict[str, Any] | None = None):
    with _lock:
        conn = _get_conn()
        try:
            data_json = json.dumps(payload or {}, ensure_ascii=False)
            conn.execute(
                "INSERT INTO plaid_transfers (transfer_id, status, last_payload) VALUES (?,?,?)\n"
                "ON CONFLICT(transfer_id) DO UPDATE SET status=excluded.status, last_payload=excluded.last_payload, updated_at=CURRENT_TIMESTAMP",
                (transfer_id, status, data_json),
            )
            conn.commit()
        finally:
            conn.close()


def get_transfer_status(transfer_id: str) -> Dict[str, Any] | None:
    """Return stored transfer row for transfer_id or None.

    Returns dict with keys: transfer_id, status, last_payload, updated_at
    """
    with _lock:
        conn = _get_conn()
        try:
            cur = conn.execute(
                "SELECT transfer_id, status, last_payload, updated_at FROM plaid_transfers WHERE transfer_id=?",
                (transfer_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            try:
                payload = json.loads(row[2]) if row[2] else {}
            except Exception:
                payload = {}
            return {"transfer_id": row[0], "status": row[1], "last_payload": payload, "updated_at": row[3]}
        finally:
            conn.close()


def insert_transfer_event(transfer_id: Optional[str], event_type: Optional[str], webhook_type: Optional[str], webhook_code: Optional[str], payload: Dict[str, Any]):
    with _lock:
        conn = _get_conn()
        try:
            conn.execute(
                "INSERT INTO plaid_transfer_events (transfer_id, event_type, webhook_type, webhook_code, payload) VALUES (?,?,?,?,?)",
                (transfer_id, event_type, webhook_type, webhook_code, json.dumps(payload, ensure_ascii=False)),
            )
            conn.commit()
        finally:
            conn.close()
