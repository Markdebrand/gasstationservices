# Alembic migration script: populate order_items from existing orders
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '0003_populate_order_items'
down_revision = '0002_schema_extension'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    now = datetime.utcnow()

    # Fetch fuel products map: code -> id
    prod_rows = bind.execute(text("SELECT id, code FROM fuel_products")).fetchall()
    code_to_id = {row.code.upper(): row.id for row in prod_rows}

    # Preferred default if mapping fails
    default_code = 'REGULAR' if 'REGULAR' in code_to_id else next(iter(code_to_id.keys()), None)

    # Fetch orders
    orders = bind.execute(text(
        """
        SELECT id, product_type, liters, price_per_liter, total_price
        FROM orders
        """
    )).fetchall()

    # Build rows for order_items
    to_insert = []
    for o in orders:
        if o.liters is None or o.price_per_liter is None or o.total_price is None:
            continue
        code = (o.product_type or '').upper()
        product_id = code_to_id.get(code) or code_to_id.get(default_code)
        if not product_id:
            # No products in catalog, skip safely
            continue
        to_insert.append({
            'order_id': o.id,
            'product_id': product_id,
            'quantity_liters': o.liters,
            'unit_price': o.price_per_liter,
            'total_price': o.total_price,
            'created_at': now,
            'updated_at': now,
        })

    if to_insert:
        order_items = sa.table(
            'order_items',
            sa.column('order_id', sa.Integer),
            sa.column('product_id', sa.Integer),
            sa.column('quantity_liters', sa.DECIMAL(12,3)),
            sa.column('unit_price', sa.DECIMAL(10,2)),
            sa.column('total_price', sa.DECIMAL(10,2)),
            sa.column('created_at', sa.DateTime(timezone=True)),
            sa.column('updated_at', sa.DateTime(timezone=True)),
        )
        op.bulk_insert(order_items, to_insert)


def downgrade():
    # Remove all auto-populated order_items (could be risky if items were added later)
    # We conservatively do nothing on downgrade to avoid deleting user data.
    pass
