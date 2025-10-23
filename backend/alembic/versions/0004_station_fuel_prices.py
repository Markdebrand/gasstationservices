# Alembic migration script: station fuel prices
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0004_station_fuel_prices'
down_revision = '0003_populate_order_items'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'station_fuel_prices',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('station_id', sa.Integer, sa.ForeignKey('stations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('product_id', sa.Integer, sa.ForeignKey('fuel_products.id'), nullable=False, index=True),
        sa.Column('price_per_unit', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('effective_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('effective_to', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
        sa.UniqueConstraint('station_id', 'product_id', 'effective_from', name='uq_station_product_from'),
        mysql_engine='InnoDB',
        mysql_charset='utf8mb4'
    )


def downgrade():
    op.drop_table('station_fuel_prices')
