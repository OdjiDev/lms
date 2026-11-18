-- ⚠️  DURCISSEMENT OPTIONNEL — NON APPLIQUÉ PAR DÉFAUT
--
-- Ces policies protègent l'isolation multi-tenant au niveau PostgreSQL.
-- Elles reposent sur `current_setting('app.org_id', true)`, qui doit être défini
-- dans CHAQUE transaction applicative :
--
--     BEGIN;
--     SET LOCAL app.org_id = '<uuid de l''organisation>';
--     -- requêtes Prisma ...
--     COMMIT;
--
-- Prisma n'expose pas ce point d'injection par requête sans passer par une
-- transaction interactive. Tant que ce wrapper n'existe pas, activer ces
-- policies casserait l'API (elle ne verrait plus aucune ligne).
--
-- Plan d'activation (étape 2) :
--   1. PrismaService.forTenant(orgId, fn) -> $transaction + SET LOCAL app.org_id
--   2. Tous les services tenant passent par ce wrapper
--   3. Exécuter ce fichier puis rejouer les tests d'isolation
--   4. Interdire les requêtes métier hors wrapper (revue + lint custom)
--
-- Rôle applicatif dédié conseillé (pas superuser, pas BYPASSRLS) :
--   CREATE ROLE lms_app LOGIN PASSWORD '...';
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lms_app;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO lms_app;

-- Helper de lecture du tenant courant
CREATE OR REPLACE FUNCTION app_current_org() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.org_id', true), '')::uuid;
$$;

-- Tables portant directement organization_id
ALTER TABLE courses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments  ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_courses ON courses
  USING (organization_id = app_current_org())
  WITH CHECK (organization_id = app_current_org());

CREATE POLICY tenant_enrollments ON enrollments
  USING (organization_id = app_current_org())
  WITH CHECK (organization_id = app_current_org());

-- Tables reliées via un parent : on dénormalise le filtre par EXISTS.
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_modules ON modules
  USING (EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = modules.course_id AND c.organization_id = app_current_org()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = modules.course_id AND c.organization_id = app_current_org()
  ));

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_lessons ON lessons
  USING (EXISTS (
    SELECT 1 FROM modules m JOIN courses c ON c.id = m.course_id
    WHERE m.id = lessons.module_id AND c.organization_id = app_current_org()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM modules m JOIN courses c ON c.id = m.course_id
    WHERE m.id = lessons.module_id AND c.organization_id = app_current_org()
  ));

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_lesson_progress ON lesson_progress
  USING (EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.id = lesson_progress.enrollment_id AND e.organization_id = app_current_org()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.id = lesson_progress.enrollment_id AND e.organization_id = app_current_org()
  ));

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_memberships ON memberships
  USING (organization_id = app_current_org())
  WITH CHECK (organization_id = app_current_org());
