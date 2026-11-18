import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { TenantContext } from '../../common/types/request';

const STAFF_ROLES: Role[] = ['OWNER', 'ADMIN', 'INSTRUCTOR'];

const CERTIFICATE_RELATIONS = {
  course: { select: { id: true, title: true, slug: true, durationMin: true, level: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  organization: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.CertificateInclude;

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  async mine(tenant: TenantContext, userId: string) {
    return this.prisma.certificate.findMany({
      where: { organizationId: tenant.organizationId, userId },
      include: CERTIFICATE_RELATIONS,
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findOne(tenant: TenantContext, userId: string, id: string) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { id, organizationId: tenant.organizationId },
      include: CERTIFICATE_RELATIONS,
    });

    // Un apprenant ne voit que ses propres certificats.
    const isStaff = STAFF_ROLES.includes(tenant.role);
    if (!certificate || (!isStaff && certificate.userId !== userId)) {
      throw new NotFoundException('Certificat introuvable');
    }

    return certificate;
  }

  /** Certificats délivrés pour un cours (formateur). */
  async byCourse(tenant: TenantContext, courseId: string) {
    return this.prisma.certificate.findMany({
      where: { organizationId: tenant.organizationId, courseId },
      include: CERTIFICATE_RELATIONS,
      orderBy: { issuedAt: 'desc' },
    });
  }

  /**
   * Vérification publique : aucune donnée sensible, seulement de quoi
   * authentifier l'attestation présentée.
   */
  async verify(serial: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { serial: serial.trim().toUpperCase() },
      include: CERTIFICATE_RELATIONS,
    });

    if (!certificate) throw new NotFoundException('Certificat inconnu');

    return {
      valid: true as const,
      serial: certificate.serial,
      issuedAt: certificate.issuedAt,
      learnerName: `${certificate.user.firstName} ${certificate.user.lastName}`,
      courseTitle: certificate.course.title,
      courseDurationMin: certificate.course.durationMin,
      organizationName: certificate.organization.name,
    };
  }
}
