/**
 * Seed de démonstration — idempotent.
 *
 *   pnpm --filter @lms/api db:seed
 *
 * Comptes créés (mot de passe commun : Yellow1234)
 *   owner@yellow.academy      OWNER
 *   formateur@yellow.academy  INSTRUCTOR
 *   apprenant@yellow.academy  LEARNER
 */
import { CourseStatus, LessonType, PrismaClient, Role } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();
const PASSWORD = 'Yellow1234';
const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

async function upsertUser(email: string, firstName: string, lastName: string) {
  const passwordHash = await hash(PASSWORD, ARGON);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, firstName, lastName, passwordHash, locale: 'fr' },
  });
}

async function main(): Promise<void> {
  const passwordHash = await hash(PASSWORD, ARGON);

  const organization = await prisma.organization.upsert({
    where: { slug: 'yellow-academy' },
    update: {},
    create: {
      name: 'Yellow Academy',
      slug: 'yellow-academy',
      locale: 'fr',
    },
  });

  const [owner, instructor, learner] = await Promise.all([
    upsertUser('owner@yellow.academy', 'Awa', 'Diallo'),
    upsertUser('formateur@yellow.academy', 'Marc', 'Lefèvre'),
    upsertUser('apprenant@yellow.academy', 'Sofia', 'Benali'),
  ]);

  const memberships: Array<[string, Role]> = [
    [owner.id, Role.OWNER],
    [instructor.id, Role.INSTRUCTOR],
    [learner.id, Role.LEARNER],
  ];

  for (const [userId, role] of memberships) {
    await prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: organization.id, userId } },
      update: { role },
      create: { organizationId: organization.id, userId, role },
    });
  }

  // ── Cours de démonstration ──────────────────────────────────────────
  const existing = await prisma.course.findUnique({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'reussir-son-onboarding' } },
    include: { modules: { include: { lessons: true } } },
  });

  const course =
    existing ??
    (await prisma.course.create({
      data: {
        organizationId: organization.id,
        authorId: instructor.id,
        title: 'Réussir son onboarding',
        slug: 'reussir-son-onboarding',
        summary: 'Les 30 premiers jours qui font la différence : posture, outils, rituels.',
        description:
          'Un parcours court et actionnable pour les nouvelles recrues : comprendre l’organisation, ' +
          'trouver ses alliés, livrer une première victoire et installer ses rituels de travail.',
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
        level: 'BEGINNER',
        durationMin: 95,
        modules: {
          create: [
            {
              title: 'Module 1 — Comprendre l’écosystème',
              position: 0,
              lessons: {
                create: [
                  {
                    title: 'Bienvenue et objectifs du parcours',
                    type: LessonType.VIDEO,
                    durationSec: 420,
                    position: 0,
                    isPreview: true,
                    videoUrl: 'https://example.com/video/bienvenue.mp4',
                  },
                  {
                    title: 'Cartographier les parties prenantes',
                    type: LessonType.TEXT,
                    durationSec: 600,
                    position: 1,
                    content: {
                      blocks: [
                        { type: 'paragraph', text: 'Listez les 10 personnes qui influencent votre travail.' },
                        { type: 'callout', tone: 'info', text: 'Une carte à jour vaut mieux qu’un organigramme.' },
                      ],
                    },
                  },
                ],
              },
            },
            {
              title: 'Module 2 — Livrer sa première victoire',
              position: 1,
              lessons: {
                create: [
                  {
                    title: 'Choisir une victoire rapide',
                    type: LessonType.VIDEO,
                    durationSec: 780,
                    position: 0,
                    videoUrl: 'https://example.com/video/quick-win.mp4',
                  },
                  {
                    title: 'Checklist des 30 premiers jours',
                    type: LessonType.FILE,
                    durationSec: 300,
                    position: 1,
                    content: { fileUrl: 'https://example.com/files/checklist-30-jours.pdf' },
                  },
                ],
              },
            },
          ],
        },
      },
      include: { modules: { include: { lessons: true } } },
    }));

  const lessons = course.modules.flatMap((m) => m.lessons);

  // Inscription de l'apprenant + une leçon terminée.
  const enrollment = await prisma.enrollment.upsert({
    where: { courseId_userId: { courseId: course.id, userId: learner.id } },
    update: {},
    create: {
      organizationId: organization.id,
      courseId: course.id,
      userId: learner.id,
    },
  });

  if (lessons[0]) {
    await prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lessons[0].id } },
      update: {},
      create: {
        enrollmentId: enrollment.id,
        lessonId: lessons[0].id,
        completedAt: new Date(),
        watchedSec: lessons[0].durationSec,
      },
    });

    const total = await prisma.lesson.count({ where: { module: { courseId: course.id } } });
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPct: Math.round((1 / total) * 100),
        lastAccessAt: new Date(),
      },
    });
  }

  console.log(`
✅ Seed terminé

   Organisation : ${organization.name} (slug: ${organization.slug})
   Mot de passe : ${PASSWORD}

   owner@yellow.academy      → OWNER
   formateur@yellow.academy  → INSTRUCTOR
   apprenant@yellow.academy  → LEARNER

   Hash de démo : ${passwordHash.slice(0, 12)}…
`);
}

main()
  .catch((error) => {
    console.error('Seed échoué', error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
