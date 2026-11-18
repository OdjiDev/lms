import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, Prisma, type Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../../common/utils/slug';
import type { TenantContext } from '../../common/types/request';
import {
  CreateCourseDto,
  CreateLessonDto,
  CreateModuleDto,
  ListCoursesQueryDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateModuleDto,
} from './dto/course.dto';

const STAFF_ROLES: Role[] = ['OWNER', 'ADMIN', 'INSTRUCTOR'];

const COURSE_CARD = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  coverUrl: true,
  status: true,
  level: true,
  language: true,
  durationMin: true,
  publishedAt: true,
  updatedAt: true,
  _count: { select: { modules: true, enrollments: true } },
} satisfies Prisma.CourseSelect;

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────────── Cours ─────────────────────────────

  async list(tenant: TenantContext, query: ListCoursesQueryDto) {
    const isStaff = STAFF_ROLES.includes(tenant.role);
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const where: Prisma.CourseWhereInput = {
      organizationId: tenant.organizationId,
      ...(isStaff
        ? query.status
          ? { status: query.status }
          : {}
        : { status: CourseStatus.PUBLISHED }),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { summary: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        select: COURSE_CARD,
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.course.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async findOne(tenant: TenantContext, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId: tenant.organizationId },
      include: {
        modules: {
          orderBy: { position: 'asc' },
          include: { lessons: { orderBy: { position: 'asc' } } },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) throw new NotFoundException('Cours introuvable');

    const isStaff = STAFF_ROLES.includes(tenant.role);
    if (!isStaff && course.status !== CourseStatus.PUBLISHED) {
      throw new NotFoundException('Cours introuvable');
    }

    return course;
  }

  async create(tenant: TenantContext, userId: string, dto: CreateCourseDto) {
    const slug = await this.uniqueSlug(tenant.organizationId, dto.title);

    return this.prisma.course.create({
      data: {
        organizationId: tenant.organizationId,
        authorId: userId,
        slug,
        title: dto.title.trim(),
        summary: dto.summary,
        description: dto.description,
        coverUrl: dto.coverUrl,
        level: dto.level,
        language: dto.language,
        durationMin: dto.durationMin ?? 0,
      },
    });
  }

  async update(tenant: TenantContext, courseId: string, dto: UpdateCourseDto) {
    await this.assertCourse(tenant.organizationId, courseId);

    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        ...dto,
        ...(dto.title ? { title: dto.title.trim() } : {}),
      },
    });
  }

  /** Publier exige un contenu minimal : au moins une leçon. */
  async publish(tenant: TenantContext, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId: tenant.organizationId },
      include: { _count: { select: { modules: true } } },
    });
    if (!course) throw new NotFoundException('Cours introuvable');

    const lessons = await this.prisma.lesson.count({ where: { module: { courseId } } });
    if (lessons === 0) {
      throw new BadRequestException('Ajoutez au moins une leçon avant de publier');
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  async archive(tenant: TenantContext, courseId: string) {
    await this.assertCourse(tenant.organizationId, courseId);
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.ARCHIVED },
    });
  }

  /** Suppression réelle seulement si personne n'est inscrit. */
  async remove(tenant: TenantContext, courseId: string) {
    await this.assertCourse(tenant.organizationId, courseId);

    const enrollments = await this.prisma.enrollment.count({ where: { courseId } });
    if (enrollments > 0) {
      throw new ConflictException(
        'Des apprenants sont inscrits : archivez le cours au lieu de le supprimer',
      );
    }

    await this.prisma.course.delete({ where: { id: courseId } });
    return { success: true };
  }

  // ──────────────────────────── Programme ──────────────────────────

  async addModule(tenant: TenantContext, courseId: string, dto: CreateModuleDto) {
    await this.assertCourse(tenant.organizationId, courseId);

    const position =
      dto.position ??
      (await this.prisma.module.count({ where: { courseId } }));

    return this.prisma.module.create({
      data: { courseId, title: dto.title.trim(), position },
      include: { lessons: true },
    });
  }

  async updateModule(tenant: TenantContext, moduleId: string, dto: UpdateModuleDto) {
    const module = await this.prisma.module.findFirst({
      where: { id: moduleId, course: { organizationId: tenant.organizationId } },
    });
    if (!module) throw new NotFoundException('Module introuvable');

    return this.prisma.module.update({
      where: { id: moduleId },
      data: { ...dto, ...(dto.title ? { title: dto.title.trim() } : {}) },
    });
  }

  async removeModule(tenant: TenantContext, moduleId: string) {
    const module = await this.prisma.module.findFirst({
      where: { id: moduleId, course: { organizationId: tenant.organizationId } },
    });
    if (!module) throw new NotFoundException('Module introuvable');

    await this.prisma.module.delete({ where: { id: moduleId } });
    return { success: true };
  }

  async addLesson(tenant: TenantContext, moduleId: string, dto: CreateLessonDto) {
    const module = await this.prisma.module.findFirst({
      where: { id: moduleId, course: { organizationId: tenant.organizationId } },
    });
    if (!module) throw new NotFoundException('Module introuvable');

    const position =
      dto.position ?? (await this.prisma.lesson.count({ where: { moduleId } }));

    return this.prisma.lesson.create({
      data: {
        moduleId,
        title: dto.title.trim(),
        type: dto.type,
        content: dto.content as Prisma.InputJsonValue | undefined,
        videoUrl: dto.videoUrl,
        durationSec: dto.durationSec ?? 0,
        position,
        isPreview: dto.isPreview ?? false,
      },
    });
  }

  async updateLesson(tenant: TenantContext, lessonId: string, dto: UpdateLessonDto) {
    await this.assertLesson(tenant.organizationId, lessonId);

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...dto,
        content: dto.content as Prisma.InputJsonValue | undefined,
        ...(dto.title ? { title: dto.title.trim() } : {}),
      },
    });
  }

  async removeLesson(tenant: TenantContext, lessonId: string) {
    await this.assertLesson(tenant.organizationId, lessonId);
    await this.prisma.lesson.delete({ where: { id: lessonId } });
    return { success: true };
  }

  // ──────────────────────────── Helpers ────────────────────────────

  private async assertCourse(organizationId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Cours introuvable');
    return course;
  }

  private async assertLesson(organizationId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, module: { course: { organizationId } } },
      select: { id: true },
    });
    if (!lesson) throw new NotFoundException('Leçon introuvable');
    return lesson;
  }

  private async uniqueSlug(organizationId: string, title: string): Promise<string> {
    const root = slugify(title) || 'cours';
    let candidate = root;
    let suffix = 2;

    while (
      await this.prisma.course.findUnique({
        where: { organizationId_slug: { organizationId, slug: candidate } },
      })
    ) {
      candidate = `${root}-${suffix++}`;
    }
    return candidate;
  }
}
