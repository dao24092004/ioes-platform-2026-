-- ============================================
-- IOES - Exam Service Database Schema
-- Version: 4.0.0
-- Adds: version column for TypeORM @VersionColumn optimistic locking
-- ============================================
--
-- `exams`, `exam_attempts`, and `questions` entities all declare
-- @VersionColumn({ default: 1 }) version!: number; for optimistic
-- locking (e.g. startExam relies on it), but only `questions` (see
-- V2__add_questions.sql) ever got a `version` column. `exams` and
-- `exam_attempts` never did, which breaks GET /exams and GET /attempts
-- with "column Exam.version does not exist" / "column
-- ExamAttempt.version does not exist" once the naming-strategy fix
-- (V4 of Task 1b) is applied.
--
-- Uses ADD COLUMN IF NOT EXISTS so this file is safely re-runnable. It is
-- NOT a no-op against `questions` in general: V1__init_schema.sql and
-- V2__add_questions.sql both define a `questions` table, and on a database
-- where V1 created it first, V2's CREATE TABLE IF NOT EXISTS is skipped, so
-- `questions` never gets V2's `version` column either — this ALTER is what
-- actually adds it there too. See
-- docs/04-operations/known-issues/exam-service-migration-drift.md.

ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE exam_attempts
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
