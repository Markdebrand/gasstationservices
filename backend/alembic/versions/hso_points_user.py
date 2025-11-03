"""
Revision ID: hso_points_user
Revises: 0a53611344c2_merge_heads
Create Date: 2025-11-03
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'hso_points_user'
down_revision = '0005_vehicles'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('users', sa.Column('hso_points', sa.Integer(), nullable=False, server_default='0'))

def downgrade():
    op.drop_column('users', 'hso_points')
