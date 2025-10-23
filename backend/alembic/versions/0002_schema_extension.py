# Alembic migration script
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '0002_schema_extension'
down_revision = '0001_init'
branch_labels = None
depends_on = None


def upgrade():
    # 1) Create fuel_products
    op.create_table(
        'fuel_products',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('code', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('octane', sa.Integer, nullable=True),
        sa.Column('unit', sa.String(10), nullable=False, server_default='L'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.sql.expression.true()),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
        mysql_engine='InnoDB',
        mysql_charset='utf8mb4'
    )

    # Seed basic products
    fuel_products = sa.table(
        'fuel_products',
        sa.column('code', sa.String),
        sa.column('name', sa.String),
        sa.column('octane', sa.Integer),
        sa.column('unit', sa.String),
        sa.column('is_active', sa.Boolean),
        sa.column('created_at', sa.DateTime),
        sa.column('updated_at', sa.DateTime),
    )
    now = datetime.utcnow()
    op.bulk_insert(
        fuel_products,
        [
            {"code": "DIESEL", "name": "Diesel", "octane": None, "unit": "L", "is_active": True, "created_at": now, "updated_at": now},
            {"code": "REGULAR", "name": "Gasolina Regular", "octane": 87, "unit": "L", "is_active": True, "created_at": now, "updated_at": now},
            {"code": "PREMIUM", "name": "Gasolina Premium", "octane": 91, "unit": "L", "is_active": True, "created_at": now, "updated_at": now},
        ]
    )

    # 2) Create order_items
    op.create_table(
        'order_items',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('order_id', sa.Integer, sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('product_id', sa.Integer, sa.ForeignKey('fuel_products.id'), nullable=False, index=True),
        sa.Column('quantity_liters', sa.DECIMAL(12, 3), nullable=False),
        sa.Column('unit_price', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('total_price', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
        mysql_engine='InnoDB',
        mysql_charset='utf8mb4'
    )

    # 3) Alter orders numeric and geo columns to DECIMAL
    with op.batch_alter_table('orders') as batch_op:
        batch_op.alter_column('liters', type_=sa.DECIMAL(12, 3))
        batch_op.alter_column('price_per_liter', type_=sa.DECIMAL(10, 2))
        batch_op.alter_column('total_price', type_=sa.DECIMAL(10, 2))
        batch_op.alter_column('delivery_latitude', type_=sa.DECIMAL(9, 6))
        batch_op.alter_column('delivery_longitude', type_=sa.DECIMAL(9, 6))

    # 4) Delivery assignments
    op.create_table(
        'delivery_assignments',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('order_id', sa.Integer, sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False, unique=True, index=True),
        sa.Column('driver_user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('arrived_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
        mysql_engine='InnoDB',
        mysql_charset='utf8mb4'
    )

    # 5) Delivery events
    op.create_table(
        'delivery_events',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('assignment_id', sa.Integer, sa.ForeignKey('delivery_assignments.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('type', sa.Enum('assigned','accepted','en_route','arrived','fueling_started','fueling_completed','completed','cancelled', name='deliveryeventtype'), nullable=False),
        sa.Column('at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('latitude', sa.DECIMAL(9, 6), nullable=True),
        sa.Column('longitude', sa.DECIMAL(9, 6), nullable=True),
        sa.Column('note', sa.String(500), nullable=True),
        sa.Column('photo_url', sa.String(512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
        mysql_engine='InnoDB',
        mysql_charset='utf8mb4'
    )


def downgrade():
    op.drop_table('delivery_events')
    op.drop_table('delivery_assignments')

    with op.batch_alter_table('orders') as batch_op:
        batch_op.alter_column('delivery_longitude', type_=sa.Float())
        batch_op.alter_column('delivery_latitude', type_=sa.Float())
        batch_op.alter_column('total_price', type_=sa.Float())
        batch_op.alter_column('price_per_liter', type_=sa.Float())
        batch_op.alter_column('liters', type_=sa.Float())

    op.drop_table('order_items')

    # Drop enum type for MySQL is implicit when table dropped; for PostgreSQL you'd drop type explicitly
    op.drop_table('fuel_products')
