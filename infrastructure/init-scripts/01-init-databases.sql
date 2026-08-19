-- ============================================
-- IOES - Database Initialization Script
-- Creates separate databases for each service
-- ============================================

-- Create databases for each service
SELECT 'Creating databases...' AS status;

-- Auth Service
SELECT 'Creating ioes_auth database' AS status;
CREATE DATABASE ioes_auth;
GRANT ALL PRIVILEGES ON DATABASE ioes_auth TO ioes;

-- Content Service
SELECT 'Creating ioes_content database' AS status;
CREATE DATABASE ioes_content;
GRANT ALL PRIVILEGES ON DATABASE ioes_content TO ioes;

-- Exam Service
SELECT 'Creating ioes_exam database' AS status;
CREATE DATABASE ioes_exam;
GRANT ALL PRIVILEGES ON DATABASE ioes_exam TO ioes;

-- Analytics Service
SELECT 'Creating ioes_analytics database' AS status;
CREATE DATABASE ioes_analytics;
GRANT ALL PRIVILEGES ON DATABASE ioes_analytics TO ioes;

-- Blockchain Service
SELECT 'Creating ioes_blockchain database' AS status;
CREATE DATABASE ioes_blockchain;
GRANT ALL PRIVILEGES ON DATABASE ioes_blockchain TO ioes;

-- Notification Service
SELECT 'Creating ioes_notification database' AS status;
CREATE DATABASE ioes_notification;
GRANT ALL PRIVILEGES ON DATABASE ioes_notification TO ioes;

-- AI Service
SELECT 'Creating ioes_ai database' AS status;
CREATE DATABASE ioes_ai;
GRANT ALL PRIVILEGES ON DATABASE ioes_ai TO ioes;

SELECT 'All databases created successfully!' AS status;
