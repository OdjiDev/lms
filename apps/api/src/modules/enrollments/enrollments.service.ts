import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, EnrollmentStatus } from '@prisma/client';
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
      include: { lessonProgress: true },
    });

    if (!enrollment || enrollment.organizationId !== tenant.organizationId) {
      return { enrollment: null, completedLessonIds: [], watchedSecByLesson: {} };
    }

    return {
      enrollment,
      completedLessonIds: enrollment.lessonProgress
        .filter((p) => p.completedAt !== null)
        .map((p) => p.lessonId),
      watchedSecByLesson: Object.fromEntries(
        enrollment.lessonProgress.map((p) => [p.lessonId, p.watchedSec]),
      ),
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
      select: { id: true, module: { select: { courseId: true } } },
    });
    if (!lesson) throw new NotFoundException('Leçon introuvable');

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

    const [totalLessons, completedLessons] = await Promise.all([
      this.prisma.lesson.count({ where: { module: { courseId } } }),
      this.prisma.lessonProgress.count({
        where: { enrollmentId: enrollment.id, completedAt: { not: null } },
      }),
    ]);

    const progressPct = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    const isDone = progressPct >= 100;

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPct,
        lastAccessAt: new Date(),
        status: isDone ? EnrollmentStatus.COMPLETED : EnrollmentStatus.ACTIVE,
        completedAt: isDone ? (enrollment.completedAt ?? new Date()) : null,
      },
    });

    return {
      enrollmentId: updated.id,
      progressPct,
      status: updated.status,
      completedLessons,
      totalLessons,
    };
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
