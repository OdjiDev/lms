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

  // ── Quiz de démonstration (idempotent) ───────────────────────────────
  const QUIZ_TITLE = 'Quiz — Les fondamentaux de l’onboarding';
  const quizLesson =
    lessons.find((lesson) => lesson.title === QUIZ_TITLE) ??
    (await prisma.lesson.create({
      data: {
        moduleId: course.modules[1]?.id ?? course.modules[0]!.id,
        title: QUIZ_TITLE,
        type: LessonType.QUIZ,
        durationSec: 300,
        position: 2,
      },
    }));

  const existingQuiz = await prisma.quiz.findUnique({ where: { lessonId: quizLesson.id } });

  if (!existingQuiz) {
    await prisma.quiz.create({
      data: {
        lessonId: quizLesson.id,
        passingScore: 70,
        questions: {
          create: [
            {
              prompt: 'Quel est l’objectif principal des 30 premiers jours ?',
              options: [
                { id: 'o0', text: 'Tout comprendre immédiatement' },
                { id: 'o1', text: 'Livrer une première victoire et créer des relations' },
                { id: 'o2', text: 'Attendre les consignes' },
              ],
              correctOptionId: 'o1',
              explanation:
                'L’objectif est de créer de la confiance : une victoire rapide et un réseau de relations utiles.',
              position: 0,
            },
            {
              prompt: 'Combien de personnes faut-il cartographier en priorité ?',
              options: [
                { id: 'o0', text: 'Une seule, son manager' },
                { id: 'o1', text: 'Une dizaine de personnes influentes' },
                { id: 'o2', text: 'Toute l’entreprise' },
              ],
              correctOptionId: 'o1',
              explanation:
                'Une dizaine de relations clés suffisent pour comprendre l’organisation sans se disperser.',
              position: 1,
            },
            {
              prompt: 'Qu’est-ce qu’une « victoire rapide » ?',
              options: [
                { id: 'o0', text: 'Un projet long et complexe' },
                { id: 'o1', text: 'Un résultat utile et visible en quelques jours' },
                { id: 'o2', text: 'Une réunion supplémentaire' },
              ],
              correctOptionId: 'o1',
              explanation: 'Elle doit être utile, visible et réalisable rapidement.',
              position: 2,
            },
          ],
        },
      },
    });
  }

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

  const firstLesson = lessons[0];
  if (firstLesson) {
    await prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: firstLesson.id } },
      update: {},
      create: {
        enrollmentId: enrollment.id,
        lessonId: firstLesson.id,
        completedAt: new Date(),
        watchedSec: firstLesson.durationSec,
      },
    });
  }

  const [total, completed] = await Promise.all([
    prisma.lesson.count({ where: { module: { courseId: course.id } } }),
    prisma.lessonProgress.count({
      where: { enrollmentId: enrollment.id, completedAt: { not: null } },
    }),
  ]);

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      progressPct: total === 0 ? 0 : Math.round((completed / total) * 100),
      lastAccessAt: new Date(),
    },
  });

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
