"""revised_schema_v2

Revision ID: bdc6d0fd7375
Revises: 001
Create Date: 2026-06-15 12:25:18.561791

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'bdc6d0fd7375'
down_revision: Union[str, Sequence[str], None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_table('secretaries')
    op.drop_index('ix_graduation_requirements_curriculum_id', table_name='graduation_requirements')
    op.drop_table('graduation_requirements')
    op.add_column('course_reviews', sa.Column('student_id', sa.UUID(), nullable=True))
    op.create_check_constraint("ck_review_rating", "course_reviews", "rating >= 1 AND rating <= 5")
    op.execute("UPDATE course_reviews SET status = 'pending' WHERE status NOT IN ('pending', 'approved', 'rejected')")
    op.create_check_constraint("ck_review_status", "course_reviews", "status IN ('pending', 'approved', 'rejected')")
    op.add_column('courses', sa.Column('lecture_hours', sa.Integer(), nullable=True))
    op.add_column('courses', sa.Column('tutorial_hours', sa.Integer(), nullable=True))
    op.add_column('courses', sa.Column('practical_hours', sa.Integer(), nullable=True))
    op.add_column('courses', sa.Column('syllabus_url', sa.String(length=500), nullable=True))
    op.drop_column('courses', 'ltp')
    op.drop_column('courses', 'syllabus')
    op.create_check_constraint("ck_prerequisite_type", "course_prerequisites", "type IN ('hard', 'soft', 'corequisite')")
    op.add_column('curricula', sa.Column('ic_credits', sa.Integer(), server_default=sa.text('0'), nullable=False))
    op.add_column('curricula', sa.Column('icb_credits', sa.Integer(), server_default=sa.text('0'), nullable=False))
    op.add_column('curricula', sa.Column('dc_credits', sa.Integer(), server_default=sa.text('0'), nullable=False))
    op.add_column('curricula', sa.Column('de_credits', sa.Integer(), server_default=sa.text('0'), nullable=False))
    op.add_column('curricula', sa.Column('fe_credits', sa.Integer(), server_default=sa.text('0'), nullable=False))
    op.add_column('curricula', sa.Column('hss_iks_credits', sa.Integer(), server_default=sa.text('0'), nullable=False))
    op.add_column('curricula', sa.Column('mtp_credits', sa.Integer(), server_default=sa.text('0'), nullable=False))
    op.add_column('curricula', sa.Column('istp_credits', sa.Integer(), server_default=sa.text('0'), nullable=False))
    op.alter_column('curricula', 'department_id',
               existing_type=sa.UUID(),
               nullable=True)
    op.drop_constraint('curricula_department_id_fkey', 'curricula', type_='foreignkey')
    op.create_foreign_key(None, 'curricula', 'departments', ['department_id'], ['id'], ondelete='SET NULL')
    op.add_column('curriculum_courses', sa.Column('basket_id', sa.UUID(), nullable=True))
    op.create_index(op.f('ix_curriculum_courses_basket_id'), 'curriculum_courses', ['basket_id'], unique=False)
    op.create_foreign_key(None, 'curriculum_courses', 'elective_baskets', ['basket_id'], ['id'], ondelete='SET NULL')
    op.create_check_constraint("ck_curriculum_course_category", "curriculum_courses", "category IN ('IC', 'DC', 'DE', 'FE', 'HSS', 'IKS', 'MTP', 'ISTP')")
    op.add_column('team_members', sa.Column('type', sa.String(length=30), nullable=True))
    op.add_column('team_members', sa.Column('linkedin_url', sa.String(length=500), nullable=True))
    op.add_column('team_members', sa.Column('portfolio', sa.String(length=200), nullable=True))
    op.add_column('team_members', sa.Column('council_session', sa.String(length=20), nullable=True))
    op.execute("UPDATE team_members SET type = 'council' WHERE type IS NULL")
    op.alter_column('team_members', 'type', existing_type=sa.String(length=30), nullable=False)
    op.alter_column('team_members', 'term_start',
               existing_type=sa.DATE(),
               nullable=True)
    op.create_check_constraint("ck_team_member_type", "team_members", "type IN ('council', 'faculty', 'secretary')")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("UPDATE team_members SET term_start = '1970-01-01' WHERE term_start IS NULL")
    op.alter_column('team_members', 'term_start',
               existing_type=sa.DATE(),
               nullable=False)
    op.drop_column('team_members', 'council_session')
    op.drop_column('team_members', 'portfolio')
    op.drop_column('team_members', 'linkedin_url')
    op.drop_column('team_members', 'type')
    op.drop_constraint(None, 'curriculum_courses', type_='foreignkey')
    op.drop_index(op.f('ix_curriculum_courses_basket_id'), table_name='curriculum_courses')
    op.drop_column('curriculum_courses', 'basket_id')
    op.drop_constraint(None, 'curricula', type_='foreignkey')
    op.create_foreign_key('curricula_department_id_fkey', 'curricula', 'departments', ['department_id'], ['id'], ondelete='CASCADE')
    op.execute("DELETE FROM curricula WHERE department_id IS NULL")
    op.alter_column('curricula', 'department_id',
               existing_type=sa.UUID(),
               nullable=False)
    op.drop_column('curricula', 'istp_credits')
    op.drop_column('curricula', 'mtp_credits')
    op.drop_column('curricula', 'hss_iks_credits')
    op.drop_column('curricula', 'fe_credits')
    op.drop_column('curricula', 'de_credits')
    op.drop_column('curricula', 'dc_credits')
    op.drop_column('curricula', 'icb_credits')
    op.drop_column('curricula', 'ic_credits')
    op.add_column('courses', sa.Column('syllabus', sa.TEXT(), autoincrement=False, nullable=True))
    op.add_column('courses', sa.Column('ltp', sa.VARCHAR(length=10), autoincrement=False, nullable=True))
    op.drop_column('courses', 'syllabus_url')
    op.drop_column('courses', 'practical_hours')
    op.drop_column('courses', 'tutorial_hours')
    op.drop_column('courses', 'lecture_hours')
    op.drop_column('course_reviews', 'student_id')
    op.create_table('graduation_requirements',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), autoincrement=False, nullable=False),
    sa.Column('curriculum_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('category', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('min_credits', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('description', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['curriculum_id'], ['curricula.id'], name='graduation_requirements_curriculum_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='graduation_requirements_pkey')
    )
    op.create_index('ix_graduation_requirements_curriculum_id', 'graduation_requirements', ['curriculum_id'], unique=False)
    op.create_table('secretaries',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), autoincrement=False, nullable=False),
    sa.Column('name', sa.VARCHAR(length=200), autoincrement=False, nullable=False),
    sa.Column('portfolio', sa.VARCHAR(length=200), autoincrement=False, nullable=False),
    sa.Column('email', sa.VARCHAR(length=200), autoincrement=False, nullable=False),
    sa.Column('council_session', sa.VARCHAR(length=20), autoincrement=False, nullable=False),
    sa.Column('is_current', sa.BOOLEAN(), server_default=sa.text('true'), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.PrimaryKeyConstraint('id', name='secretaries_pkey')
    )
    # ### end Alembic commands ###
