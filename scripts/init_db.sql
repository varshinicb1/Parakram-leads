-- Sigma Lead Intelligence - Database Initialization
-- Run this manually if not using Alembic migrations

CREATE DATABASE sigma_leads;
CREATE USER sigma WITH PASSWORD 'sigma';
GRANT ALL PRIVILEGES ON DATABASE sigma_leads TO sigma;
\c sigma_leads
GRANT ALL ON SCHEMA public TO sigma;
