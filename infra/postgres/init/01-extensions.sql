-- Extensions requises par le schéma Prisma.
-- Ce script ne s'exécute qu'à la création initiale du volume Postgres.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- emails insensibles à la casse
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- recherche floue (ILIKE indexé)
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- recherche "developpeur" -> "développeur"
