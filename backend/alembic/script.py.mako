##
## Alembic migration script template
##
<%
import re
import datetime
from alembic import util
%>
"""
Revision ID: ${up_revision}
% if down_revision:
Revises: ${", ".join(down_revision) if down_revision.__class__ is list else down_revision}
% else:
Revises: None
% endif
Create Date: ${create_date}

"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

def upgrade():
    ${upgrades if upgrades else "pass"}

def downgrade():
    ${downgrades if downgrades else "pass"}

