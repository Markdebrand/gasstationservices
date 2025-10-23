# Alembic migration script
revision = '0005_vehicles'
down_revision = '0a53611344c2'
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        'vehicles',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), index=True, nullable=False),
        sa.Column('plate', sa.String(32), nullable=False, index=True),
        sa.Column('brand', sa.String(100), nullable=True),
        sa.Column('model', sa.String(100), nullable=True),
        sa.Column('year', sa.String(10), nullable=True),
        sa.Column('color', sa.String(50), nullable=True),
        sa.Column('vin', sa.String(64), nullable=True),
        sa.Column('photos', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
    )


def downgrade():
    op.drop_table('vehicles')
