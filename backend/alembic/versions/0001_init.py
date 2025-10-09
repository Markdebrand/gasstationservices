# Alembic migration script
revision = '0001_init'
down_revision = None
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('email', sa.String(255), unique=True, index=True),
        sa.Column('full_name', sa.String(255)),
        sa.Column('hashed_password', sa.String(255)),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_admin', sa.Boolean, default=False),
        sa.Column('role', sa.String(20), default='user'),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
    )
    op.create_table(
        'stations',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('name', sa.String(255), index=True),
        sa.Column('address', sa.String(255)),
        sa.Column('latitude', sa.Float),
        sa.Column('longitude', sa.Float),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
    )
    op.create_table(
        'orders',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), index=True),
        sa.Column('station_id', sa.Integer, sa.ForeignKey('stations.id'), index=True),
        sa.Column('product_type', sa.String(50)),
        sa.Column('liters', sa.Float),
        sa.Column('price_per_liter', sa.Float),
        sa.Column('total_price', sa.Float),
        sa.Column('delivery_address', sa.String(255)),
        sa.Column('delivery_latitude', sa.Float),
        sa.Column('delivery_longitude', sa.Float),
        sa.Column('status', sa.Enum('pending', 'accepted', 'en_route', 'completed', 'cancelled', name='orderstatus'), default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
    )

def downgrade():
    op.drop_table('orders')
    op.drop_table('stations')
    op.drop_table('users')
