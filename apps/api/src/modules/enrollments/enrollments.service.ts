import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, EnrollmentStatus, LessonType, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { TenantContext } from '../../common/types/request';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async enroll(tenant: TenantContext, userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        organizationId: tenant.organizationId,
        status: CourseStatus.PUBLISHED,
      },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Cours publié introuvable');

    const existing = await this.prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId, userId } },
    });

    if (existing) {
      if (existing.status === EnrollmentStatus.CANCELLED) {
        return this.prisma.enrollment.update({
          where: { id: existing.id },
          data: { status: EnrollmentStatus.ACTIVE, lastAccessAt: new Date() },
        });
      }
      return existing; // idempotent
    }

    return this.prisma.enrollment.create({
      data: {
        organizationId: tenant.organizationId,
        courseId,
        userId,
        lastAccessAt: new Date(),
      },
    });
  }

  async mine(tenant: TenantContext, userId: string) {
    return this.prisma.enrollment.findMany({
      where: {
        organizationId: tenant.organizationId,
        userId,
        status: { not: EnrollmentStatus.CANCELLED },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            coverUrl: true,
            durationMin: true,
            _count: { select: { modules: true } },
          },
        },
      },
      orderBy: { lastAccessAt: 'desc' },
    });
  }

  async courseEnrollments(tenant: TenantContext, courseId: string) {
    return this.prisma.enrollment.findMany({
      where: { organizationId: tenant.organizationId, courseId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async cancel(tenant: TenantContext, userId: string, enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, organizationId: tenant.organizationId, userId },
    });
    if (!enrollment) throw new NotFoundException('Inscription introuvable');

    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: EnrollmentStatus.CANCELLED },
    });
  }

  async myProgress(tenant: TenantContext, userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId, userId } },
      include: {
        lessonProgress: true,
        certificate: { select: { id: true, serial: true, issuedAt: true } },
      },
    });

    if (!enrollment || enrollment.organizationId !== tenant.organizationId) {
      return {
        enrollment: null,
        completedLessonIds: [],
        watchedSecByLesson: {},
        certificate: null,
      };
    }

    return {
      enrollment,
      completedLessonIds: enrollment.lessonProgress
        .filter((p) => p.completedAt !== null)
        .map((p) => p.lessonId),
      watchedSecByLesson: Object.fromEntries(
        enrollment.lessonProgress.map((p) => [p.lessonId, p.watchedSec]),
      ),
      certificate: enrollment.certificate,
    };
  }

  /**
   * Marque/démarque une leçon puis recalcule la progression du cours.
   * Source de vérité = base, jamais le client.
   */
  async setLessonCompletion(
    tenant: TenantContext,
    userId: string,
    lessonId: string,
    completed: boolean,
  ) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, module: { course: { organizationId: tenant.organizationId } } },
      select: { id: true, type: true, module: { select: { courseId: true } } },
    });
    if (!lesson) throw new NotFoundException('Leçon introuvable');

    if (lesson.type === LessonType.QUIZ) {
      throw new BadRequestException(
        'Cette leçon est validée par un quiz : réussissez-le pour la marquer comme terminée.',
      );
    }

    const courseId = lesson.module.courseId;
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId, userId } },
    });

    if (!enrollment || enrollment.status === EnrollmentStatus.CANCELLED) {
      throw new ForbiddenException('Inscrivez-vous au cours avant de suivre les leçons');
    }

    const completedAt = completed ? new Date() : null;

    await this.prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      create: { enrollmentId: enrollment.id, lessonId, completedAt },
      update: { completedAt },
    });

    const summary = await this.recomputeProgress(enrollment.id, courseId);
    return summary;
  }

  /**
   * Recalcule et persiste la progression d'une inscription à partir de la base.
   * Utilisé après une complétion manuelle ou la réussite d'un quiz.
   */
  async recomputeProgress(enrollmentId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        completedAt: true,
        organizationId: true,
        courseId: true,
        userId: true,
      },
    });
    if (!enrollment) throw new NotFoundException('Inscription introuvable');

    const [totalLessons, completedLessons] = await Promise.all([
      this.prisma.lesson.count({ where: { module: { courseId } } }),
      this.prisma.lessonProgress.count({
        where: { enrollmentId, completedAt: { not: null } },
      }),
    ]);

    const progressPct = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    const isDone = progressPct >= 100;

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progressPct,
        lastAccessAt: new Date(),
        status: isDone ? EnrollmentStatus.COMPLETED : EnrollmentStatus.ACTIVE,
        completedAt: isDone ? (enrollment.completedAt ?? new Date()) : null,
      },
    });

    // Parcours terminé : le certificat est émis une seule fois, en base.
    if (isDone) {
      await this.ensureCertificate(enrollment);
    }

    return {
      enrollmentId: updated.id,
      progressPct,
      status: updated.status,
      completedLessons,
      totalLessons,
    };
  }

  /**
   * Émet le certificat d'une inscription terminée (idempotent).
   * Le numéro de série est aléatoire et unique ; il sert à la vérification publique.
   */
  private async ensureCertificate(enrollment: {
    id: string;
    organizationId: string;
    courseId: string;
    userId: string;
  }) {
    const existing = await this.prisma.certificate.findUnique({
      where: { enrollmentId: enrollment.id },
    });
    if (existing) return existing;

    const year = new Date().getFullYear();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const serial = `LMS-${year}-${randomBytes(4).toString('hex').toUpperCase()}`;
      try {
        return await this.prisma.certificate.create({
          data: {
            organizationId: enrollment.organizationId,
            courseId: enrollment.courseId,
            userId: enrollment.userId,
            enrollmentId: enrollment.id,
            serial,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const created = await this.prisma.certificate.findUnique({
            where: { enrollmentId: enrollment.id },
          });
          if (created) return created;
          continue; // collision de série : on retente
        }
        throw error;
      }
    }

    throw new ConflictException('Impossible de générer un numéro de certificat unique');
  }

  /** Stats agrégées pour le tableau de bord formateur. */
  async orgStats(tenant: TenantContext) {
    const [courses, published, learners, enrollments, completed] = await this.prisma.$transaction([
      this.prisma.course.count({ where: { organizationId: tenant.organizationId } }),
      this.prisma.course.count({
        where: { organizationId: tenant.organizationId, status: CourseStatus.PUBLISHED },
      }),
      this.prisma.membership.count({
        where: { organizationId: tenant.organizationId, role: 'LEARNER' },
      }),
      this.prisma.enrollment.count({ where: { organizationId: tenant.organizationId } }),
      this.prisma.enrollment.count({
        where: { organizationId: tenant.organizationId, status: EnrollmentStatus.COMPLETED },
      }),
    ]);

    return {
      courses,
      publishedCourses: published,
      learners,
      enrollments,
      completedEnrollments: completed,
      completionRate: enrollments === 0 ? 0 : Math.round((completed / enrollments) * 100),
    };
  }
}
