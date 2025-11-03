revision = '20251014_alter_token_length_sharing_invitations'
down_revision = '20251001_add_sharing'
branch_labels = None
depends_on = None
"""
Aumenta la longitud del campo 'token' en la tabla 'sharing_invitations' para soportar JWT largos.
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.alter_column('sharing_invitations', 'token',
        existing_type=sa.String(length=72),
        type_=sa.String(length=512),
        existing_nullable=False)

def downgrade():
    op.alter_column('sharing_invitations', 'token',
        existing_type=sa.String(length=512),
        type_=sa.String(length=72),
        existing_nullable=False)
