# Alembic migration script
revision = '0002_saved_locations'
down_revision = '0001_init'
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        'saved_locations',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), index=True, nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('address', sa.String(255), nullable=False),
        sa.Column('lat', sa.Float, nullable=False),
        sa.Column('lon', sa.Float, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
    )


def downgrade():
    op.drop_table('saved_locations')
