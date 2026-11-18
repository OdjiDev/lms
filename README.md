# 🟡 Yellow LMS

Learning Management System **multi-tenant** : catalogue, parcours, progression, suivi des apprenants.
Web et mobile partagent une seule API métier — donc une seule vérité.

```
┌──────────────┐   ┌──────────────┐
│  Next.js     │   │  Expo / RN   │      clients
│  apps/web    │   │  apps/mobile │
└──────┬───────┘   └──────┬───────┘
       │  REST + JWT      │
       ▼                  ▼
┌──────────────────────────────────┐   ┌──────────────────┐
│  NestJS — apps/api               │──▶│ FastAPI          │
│  auth · orgs · cours · progress  │   │ services/ml      │
└──────┬───────────────────────────┘   └────────┬─────────┘
       │ Prisma                                 │ (reco, scoring)
       ▼                                        ▼
┌──────────────────────────────────────────────────────────┐
│  PostgreSQL 18 · Redis · MinIO (médias) · Mailpit (dev)  │
└──────────────────────────────────────────────────────────┘
```

## Stack

| Couche     | Techno                                        | Rôle |
| ---------- | --------------------------------------------- | ---- |
| Web        | Next.js 15 (App Router), React 19, Tailwind 4 | Vitrine, back-office, espace apprenant |
| Mobile     | Expo + expo-router                            | Apprenant nomade |
| API métier | NestJS 11 + Prisma 6                          | Source de vérité, auth, tenancy |
| Calcul     | FastAPI                                       | Recommandations, scoring, analytique |
| Données    | PostgreSQL 18 (+ Redis)                       | Persistance, cache |

Monorepo **pnpm + Turborepo**. Types partagés dans `packages/types`.

## Démarrage

```bash
cp .env.example .env
pnpm install

pnpm infra:up          # Postgres :5433, Redis :6380, Mailpit :8025

cp apps/api/.env.example apps/api/.env   # puis changer JWT_ACCESS_SECRET
cp apps/web/.env.example apps/web/.env

pnpm --filter @lms/api db:generate
pnpm db:migrate
pnpm db:seed

pnpm dev               # web :3000 · api :4000 · mobile :8081
```

- Web : http://localhost:3000
- API : http://localhost:4000/api/v1 · Swagger : http://localhost:4000/api/docs
- ML : http://localhost:8000/docs
- Mailpit : http://localhost:8025

### Comptes de démonstration

Mot de passe unique : `Yellow1234`

| Email                      | Rôle       |
| -------------------------- | ---------- |
| owner@yellow.academy       | OWNER      |
| formateur@yellow.academy   | INSTRUCTOR |
| apprenant@yellow.academy   | LEARNER    |

Organisation : `yellow-academy` (« Yellow Academy »).

## Structure

```
apps/
  api/        NestJS — modules auth, courses, enrollments, users, organizations
  web/        Next.js — landing, login/register, dashboard, catalogue, player
  mobile/     Expo — login, catalogue, détail cours, profil
services/
  ml/         FastAPI — POST /v1/recommend (heuristique explicable)
packages/
  types/      Contrats JSON partagés web ↔ mobile
infra/
  postgres/   Init SQL (extensions)
  rls.sql     Durcissement multi-tenant (étape 2, non appliqué par défaut)
```

## Multi-tenant

Chaque requête authentifiée est rattachée à **une organisation active** :

1. `JwtAuthGuard` vérifie l'access token (`sub`, 15 min).
2. `TenantGuard` résout l'organisation via le header `X-Org-Id`
   (ou la première appartenance), **en revérifiant l'appartenance en base**.
3. `RolesGuard` applique `@Roles(...)` : `OWNER`, `ADMIN`, `INSTRUCTOR`, `LEARNER`.

Toutes les entités métier portent `organizationId`, et chaque service filtre dessus.
`infra/rls.sql` contient les policies Postgres prêtes à activer (Row Level Security)
quand on passera à un accès DB par transaction avec `SET LOCAL app.org_id`.

## API (v1)

| Méthode | Route | Accès |
| ------- | ----- | ----- |
| POST | `/auth/register` | public — crée org + OWNER |
| POST | `/auth/login` | public |
| POST | `/auth/refresh` | public — rotation + détection de réutilisation |
| POST | `/auth/logout` | public |
| GET | `/auth/me` | authentifié |
| GET | `/courses` | membres (apprenants : publiés uniquement) |
| POST/PATCH | `/courses`, `/courses/:id` | staff |
| POST | `/courses/:id/publish` | staff — exige ≥ 1 leçon |
| POST | `/courses/:id/modules`, `/modules/:id/lessons` | staff |
| POST | `/courses/:id/enroll` | membre |
| GET | `/me/enrollments`, `/courses/:id/my-progress` | membre |
| POST/DELETE | `/lessons/:id/complete` | inscrit — recalcule la progression |
| GET | `/lessons/:id/quiz` | inscrit — version sans les corrections |
| GET | `/lessons/:id/quiz/edit` | staff — version complète |
| PUT | `/lessons/:id/quiz`, `POST /lessons/:id/quiz/questions` | staff |
| DELETE | `/lessons/:id/quiz`, `/quiz-questions/:id` | staff |
| POST | `/lessons/:id/quiz/attempts` | inscrit — correction serveur, valide la leçon si réussi |
| GET | `/lessons/:id/quiz/results` | staff — résultats agrégés |
| GET | `/stats` | staff |

## Quiz

- Un quiz est rattaché à une leçon de type `QUIZ` (1 quiz par leçon, 2 à 6 propositions par question).
- La correction est **toujours serveur** : l'API apprenant ne renvoie jamais `correctOptionId` ni l'explication avant soumission.
- Une tentative est historisée (`quiz_attempts`) ; le meilleur score fait foi.
- Réussir le quiz (score ≥ seuil, 70 % par défaut) valide automatiquement la leçon et recalcule la progression.
- La complétion manuelle (`/lessons/:id/complete`) est refusée sur une leçon quiz.

## Sécurité

- Mots de passe : Argon2id (`@node-rs/argon2`, 19 MiB / 2 passes).
- Access token 15 min, refresh token rotatif hashé en base (SHA-256).
- Réutilisation d'un refresh token → révocation de toutes les sessions.
- Cookies web `httpOnly` + rafraîchissement proactif dans le middleware edge.
- Pas d'énumération de comptes au login.
- Validation stricte des entrées (`class-validator`, `whitelist`).

## Roadmap

1. ~~**Quiz & évaluations**~~ ✅ (auto-correction côté NestJS ; scoring avancé FastAPI à venir).
2. **Certificats** PDF + vérification publique.
3. **Invitations** par email (Mailpit en dev), import CSV d'apprenants.
4. **Médias** : stockage S3-compatible (Scaleway, R2, Garage) + URLs présignées, transcodage vidéo.
5. **Analytics** : temps de visionnage, taux d'abandon par leçon, cohortes.
6. **RLS Postgres** activé + tests d'isolation inter-tenant.
7. **Notifications** (Redis/BullMQ) : relances, échéances.
