"""
Conector Argus que reutiliza el transporte XML-RPC genérico de Odoo.

No añade lógica: hereda métodos genéricos (`search_read`, `read`, `read_group`, etc.)
que ya incluyen sanitización de campos y reintentos.
"""
from app.integrations.odoo.odoo_connector import OdooConnector


class ArgusConnector(OdooConnector):
    pass
