import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus, LessonType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { TenantContext } from '../../common/types/request';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { CreateQuestionDto, SubmitQuizDto, UpsertQuizDto } from './dto/quiz.dto';

interface QuizOption {
  id: string;
  text: string;
}

const QUESTION_SELECT = {
  id: true,
  quizId: true,
  prompt: true,
  options: true,
  correctOptionId: true,
  explanation: true,
  position: true,
} satisfies Prisma.QuizQuestionSelect;

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollments: EnrollmentsService,
  ) {}

  // ───────────────────────── Côté formateur ─────────────────────────

  async upsert(tenant: TenantContext, lessonId: string, dto: UpsertQuizDto) {
    const lesson = await this.assertQuizLesson(tenant, lessonId);

    return this.prisma.quiz.upsert({
      where: { lessonId: lesson.id },
      create: { lessonId: lesson.id, passingScore: dto.passingScore ?? 70 },
      update: { passingScore: dto.passingScore ?? 70 },
      include: { questions: { orderBy: { position: 'asc' } } },
    });
  }

  async addQuestion(tenant: TenantContext, lessonId: string, dto: CreateQuestionDto) {
    const lesson = await this.assertQuizLesson(tenant, lessonId);

    const texts = dto.options.map((option) => option.trim()).filter(Boolean);
    if (texts.length < 2) {
      throw new BadRequestException('Un quiz doit proposer au moins deux réponses');
    }
    if (dto.correctIndex >= texts.length) {
      throw new BadRequestException('La bonne réponse ne correspond à aucune proposition');
    }

    const options: QuizOption[] = texts.map((text, index) => ({ id: `o${index}`, text }));

    const quiz = await this.prisma.quiz.upsert({
      where: { lessonId: lesson.id },
      create: { lessonId: lesson.id },
      update: {},
    });

    const position = await this.prisma.quizQuestion.count({ where: { quizId: quiz.id } });

    return this.prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        prompt: dto.prompt.trim(),
        options: options as unknown as Prisma.InputJsonValue,
        correctOptionId: options[dto.correctIndex]!.id,
        explanation: dto.explanation?.trim() || null,
        position,
      },
      select: QUESTION_SELECT,
    });
  }

  async removeQuestion(tenant: TenantContext, questionId: string) {
    const question = await this.prisma.quizQuestion.findFirst({
      where: {
        id: questionId,
        quiz: { lesson: { module: { course: { organizationId: tenant.organizationId } } } },
      },
      select: { id: true },
    });
    if (!question) throw new NotFoundException('Question introuvable');

    await this.prisma.quizQuestion.delete({ where: { id: questionId } });
    return { success: true };
  }

  async remove(tenant: TenantContext, lessonId: string) {
    const lesson = await this.assertQuizLesson(tenant, lessonId);
    await this.prisma.quiz.deleteMany({ where: { lessonId: lesson.id } });
    return { success: true };
  }

  // ────────────────────────── Côté apprenant ────────────────────────

  /**
   * Version apprenant : jamais de bonne réponse ni d'explication avant correction.
   */
  async findForLearner(tenant: TenantContext, userId: string, lessonId: string) {
    const lesson = await this.assertLesson(tenant, lessonId);
    const quiz = await this.prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
      include: { questions: { orderBy: { position: 'asc' } } },
    });

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId: lesson.module.courseId, userId } },
      select: { id: true, status: true },
    });

    const attempts = quiz
      ? await this.prisma.quizAttempt.findMany({
          where: { quizId: quiz.id, userId },
          orderBy: { submittedAt: 'desc' },
          select: { id: true, score: true, passed: true, submittedAt: true },
        })
      : [];

    if (!quiz) {
      return {
        quiz: null,
        canAttempt: false,
        bestScore: null,
        passed: false,
        attempts: [],
      };
    }

    return {
      quiz: {
        id: quiz.id,
        lessonId: quiz.lessonId,
        passingScore: quiz.passingScore,
        questions: quiz.questions.map((question) => ({
          id: question.id,
          prompt: question.prompt,
          position: question.position,
          options: question.options as unknown as QuizOption[],
        })),
      },
      canAttempt:
        Boolean(enrollment) &&
        enrollment!.status !== EnrollmentStatus.CANCELLED &&
        quiz.questions.length > 0,
      bestScore: attempts.length ? Math.max(...attempts.map((attempt) => attempt.score)) : null,
      passed: attempts.some((attempt) => attempt.passed),
      attempts,
    };
  }

  async submit(tenant: TenantContext, userId: string, lessonId: string, dto: SubmitQuizDto) {
    const lesson = await this.assertLesson(tenant, lessonId);
    const quiz = await this.prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
      include: { questions: { orderBy: { position: 'asc' } } },
    });

    if (!quiz) throw new NotFoundException('Aucun quiz sur cette leçon');
    if (quiz.questions.length === 0) {
      throw new BadRequestException('Ce quiz ne contient encore aucune question');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId: lesson.module.courseId, userId } },
    });
    if (!enrollment || enrollment.status === EnrollmentStatus.CANCELLED) {
      throw new ForbiddenException('Inscrivez-vous au cours avant de passer le quiz');
    }

    const answers = dto.answers ?? {};

    const details = quiz.questions.map((question) => {
      const given = answers[question.id] ?? null;
      const isCorrect = given === question.correctOptionId;
      return {
        questionId: question.id,
        given,
        correctOptionId: question.correctOptionId,
        isCorrect,
        explanation: question.explanation,
      };
    });

    const correct = details.filter((detail) => detail.isCorrect).length;
    const score = Math.round((correct / quiz.questions.length) * 100);
    const passed = score >= quiz.passingScore;

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId,
        enrollmentId: enrollment.id,
        score,
        passed,
        answers: answers as Prisma.InputJsonValue,
      },
      select: { id: true, score: true, passed: true, submittedAt: true },
    });

    if (passed) {
      await this.prisma.lessonProgress.upsert({
        where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id } },
        create: { enrollmentId: enrollment.id, lessonId: lesson.id, completedAt: new Date() },
        update: { completedAt: new Date() },
      });
      await this.enrollments.recomputeProgress(enrollment.id, lesson.module.courseId);
    }

    return {
      attempt,
      score,
      passed,
      passingScore: quiz.passingScore,
      correct,
      total: quiz.questions.length,
      details,
    };
  }

  // ────────────────────────── Côté formateur ───────────────────────

  /** Vue complète : inclut les bonnes réponses (staff uniquement). */
  async findForStaff(tenant: TenantContext, lessonId: string) {
    const lesson = await this.assertLesson(tenant, lessonId);
    const quiz = await this.prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
      include: { questions: { orderBy: { position: 'asc' }, select: QUESTION_SELECT } },
    });

    if (!quiz) return null;

    return {
      id: quiz.id,
      lessonId: quiz.lessonId,
      passingScore: quiz.passingScore,
      questions: quiz.questions.map((question) => ({
        ...question,
        options: question.options as unknown as QuizOption[],
      })),
    };
  }

  async results(tenant: TenantContext, lessonId: string) {
    const lesson = await this.assertLesson(tenant, lessonId);
    const quiz = await this.prisma.quiz.findUnique({
      where: { lessonId: lesson.id },
      select: { id: true },
    });
    if (!quiz) throw new NotFoundException('Aucun quiz sur cette leçon');

    const attempts = await this.prisma.quizAttempt.findMany({
      where: { quizId: quiz.id },
      orderBy: { submittedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      take: 200,
    });

    const best = new Map<string, { user: string; score: number; passed: boolean }>();
    for (const attempt of attempts) {
      const current = best.get(attempt.userId);
      if (!current || attempt.score > current.score) {
        best.set(attempt.userId, {
          user: `${attempt.user.firstName} ${attempt.user.lastName}`,
          score: attempt.score,
          passed: attempt.passed,
        });
      }
    }

    const learners = [...best.values()];

    return {
      attempts: attempts.map((attempt) => ({
        id: attempt.id,
        user: attempt.user,
        score: attempt.score,
        passed: attempt.passed,
        submittedAt: attempt.submittedAt,
      })),
      learnersCount: learners.length,
      passedCount: learners.filter((learner) => learner.passed).length,
      averageBestScore: learners.length
        ? Math.round(learners.reduce((sum, learner) => sum + learner.score, 0) / learners.length)
        : 0,
    };
  }

  // ─────────────────────────── Helpers ────────────────────────────

  private async assertLesson(tenant: TenantContext, lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, module: { course: { organizationId: tenant.organizationId } } },
      select: {
        id: true,
        type: true,
        title: true,
        module: { select: { courseId: true } },
      },
    });
    if (!lesson) throw new NotFoundException('Leçon introuvable');
    return lesson;
  }

  private async assertQuizLesson(tenant: TenantContext, lessonId: string) {
    const lesson = await this.assertLesson(tenant, lessonId);
    if (lesson.type !== LessonType.QUIZ) {
      throw new BadRequestException(
        'Cette leçon n’est pas de type « Quiz ». Modifiez son type avant d’ajouter des questions.',
      );
    }
    return lesson;
  }
}
