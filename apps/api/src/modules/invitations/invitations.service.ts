import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role, type InvitationStatus, type PrismaClient } from '@prisma/client';
import { hash, verify } from '@node-rs/argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService, type TokenPair } from '../auth/token.service';
import { MailService } from '../mail/mail.service';
import type { TenantContext } from '../../common/types/request';
import { parseCsvRole, parseInvitationCsv } from './csv';
import type {
  AcceptInvitationDto,
  CreateInvitationDto,
  ImportInvitationsDto,
} from './dto/invitation.dto';

const INVITATION_TTL_DAYS = 7;
const MAX_IMPORT_ROWS = 200;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ARGON_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Propriétaire',
  ADMIN: 'Administrateur',
  INSTRUCTOR: 'Formateur',
  LEARNER: 'Apprenant',
};

const STATUS_RANK: Record<InvitationStatus, number> = {
  PENDING: 0,
  EXPIRED: 1,
  ACCEPTED: 2,
  REVOKED: 3,
};

const INVITATION_INCLUDE = {
  course: { select: { id: true, title: true, slug: true } },
  invitedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.InvitationInclude;

interface InvitationOwner {
  id: string;
  organizationId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  courseId: string | null;
  tokenHash: string;
  status: InvitationStatus;
  expiresAt: Date;
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
  ) {}

  /** Invitations de l'organisation courante (staff). */
  async list(tenant: TenantContext) {
    const invitations = await this.prisma.invitation.findMany({
      where: { organizationId: tenant.organizationId },
      include: INVITATION_INCLUDE,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return invitations
      .map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        role: invitation.role,
        status: effectiveStatus(invitation.status, invitation.expiresAt),
        course: invitation.course,
        invitedBy: invitation.invitedBy,
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
        revokedAt: invitation.revokedAt,
        createdAt: invitation.createdAt,
      }))
      .sort(
        (a, b) =>
          STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async create(tenant: TenantContext, invitedById: string, dto: CreateInvitationDto) {
    return this.createInvitation(tenant, invitedById, {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: (dto.role ?? 'LEARNER') as Role,
      courseId: dto.courseId,
    });
  }

  /**
   * Import CSV : chaque ligne devient une invitation individuelle.
   * Les lignes invalides ou en conflit sont signalées sans bloquer le lot.
   */
  async importCsv(tenant: TenantContext, invitedById: string, dto: ImportInvitationsDto) {
    const rows = parseInvitationCsv(dto.csv);

    if (rows.length === 0) {
      throw new BadRequestException('Aucune ligne exploitable dans le fichier CSV');
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`Import limité à ${MAX_IMPORT_ROWS} lignes par fichier`);
    }

    const defaultRole = (dto.role ?? 'LEARNER') as Role;
    const seen = new Set<string>();
    const skipped: Array<{ line: number; email: string; reason: string }> = [];
    let created = 0;

    for (const row of rows) {
      const email = row.email.trim().toLowerCase();

      if (!EMAIL_PATTERN.test(email)) {
        skipped.push({ line: row.line, email: row.email, reason: 'Adresse email invalide' });
        continue;
      }
      if (seen.has(email)) {
        skipped.push({ line: row.line, email, reason: 'Doublon dans le fichier' });
        continue;
      }
      seen.add(email);

      const role = (parseCsvRole(row.role) ?? defaultRole) as Role;

      try {
        await this.createInvitation(tenant, invitedById, {
          email,
          firstName: row.firstName,
          lastName: row.lastName,
          role,
          courseId: dto.courseId,
        });
        created += 1;
      } catch (error) {
        if (
          error instanceof ConflictException ||
          error instanceof NotFoundException ||
          error instanceof BadRequestException ||
          error instanceof ForbiddenException
        ) {
          skipped.push({ line: row.line, email, reason: error.message });
        } else {
          throw error;
        }
      }
    }

    return {
      total: rows.length,
      created,
      skipped,
    };
  }

  private async createInvitation(
    tenant: TenantContext,
    invitedById: string,
    input: {
      email: string;
      firstName?: string;
      lastName?: string;
      role: Role;
      courseId?: string | null;
    },
  ) {
    const email = input.email.trim().toLowerCase();
    const role = input.role;

    if (!EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('Adresse email invalide');
    }
    if (role === Role.OWNER) {
      throw new ForbiddenException('Le rôle propriétaire ne peut pas être délégué');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const membership = await this.prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: tenant.organizationId,
            userId: existingUser.id,
          },
        },
      });
      if (membership) {
        throw new ConflictException('Cette personne est déjà membre de l’organisation');
      }
    }

    const pending = await this.prisma.invitation.findFirst({
      where: {
        organizationId: tenant.organizationId,
        email,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });
    if (pending) {
      throw new ConflictException('Une invitation est déjà en attente pour cette adresse');
    }

    if (input.courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: input.courseId, organizationId: tenant.organizationId },
        select: { id: true },
      });
      if (!course) throw new NotFoundException('Cours introuvable');
    }

    const rawToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId: tenant.organizationId,
        invitedById,
        email,
        firstName: input.firstName?.trim() || null,
        lastName: input.lastName?.trim() || null,
        role,
        courseId: input.courseId ?? null,
        tokenHash: sha256(rawToken),
        expiresAt,
      },
      include: INVITATION_INCLUDE,
    });

    const acceptUrl = this.acceptUrl(rawToken);
    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: tenant.organizationId },
      select: { name: true },
    });

    await this.mail.sendInvitation({
      to: email,
      organizationName: organization.name,
      invitedByName: `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`,
      roleLabel: ROLE_LABELS[role],
      courseTitle: invitation.course?.title,
      acceptUrl,
      expiresAt,
    });

    return {
      invitation: this.serialize(invitation),
      acceptUrl,
    };
  }

  /** Renvoie un nouveau lien : l'ancien jeton est invalidé. */
  async resend(tenant: TenantContext, id: string) {
    const invitation = await this.findOwned(tenant, id);

    if (invitation.status === 'ACCEPTED') {
      throw new ConflictException('Cette invitation a déjà été acceptée');
    }

    const rawToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        tokenHash: sha256(rawToken),
        status: 'PENDING',
        expiresAt,
        revokedAt: null,
        acceptedAt: null,
      },
      include: INVITATION_INCLUDE,
    });

    const acceptUrl = this.acceptUrl(rawToken);
    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: tenant.organizationId },
      select: { name: true },
    });

    await this.mail.sendInvitation({
      to: updated.email,
      organizationName: organization.name,
      invitedByName: `${updated.invitedBy.firstName} ${updated.invitedBy.lastName}`,
      roleLabel: ROLE_LABELS[updated.role],
      courseTitle: updated.course?.title,
      acceptUrl,
      expiresAt,
    });

    return { invitation: this.serialize(updated), acceptUrl };
  }

  async revoke(tenant: TenantContext, id: string) {
    const invitation = await this.findOwned(tenant, id);

    if (invitation.status === 'ACCEPTED') {
      throw new ConflictException('Une invitation acceptée ne peut pas être annulée');
    }

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    return { success: true as const };
  }

  /** Aperçu public d'une invitation (le jeton est le secret). */
  async preview(rawToken: string) {
    const invitation = await this.findByToken(rawToken);
    const status = effectiveStatus(invitation.status, invitation.expiresAt);

    if (status === 'EXPIRED' && invitation.status === 'PENDING') {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });

    return {
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: invitation.role,
      roleLabel: ROLE_LABELS[invitation.role],
      organizationName: invitation.organizationName,
      courseTitle: invitation.courseTitle,
      invitedByName: invitation.invitedByName,
      status,
      expiresAt: invitation.expiresAt,
      needsAccount: !existingUser,
    };
  }

  /**
   * Acceptation : crée le compte si besoin, rattache l'utilisateur à
   * l'organisation, l'inscrit au cours éventuel et ouvre une session.
   */
  async accept(
    rawToken: string,
    dto: AcceptInvitationDto,
    meta: { userAgent?: string; ip?: string },
  ) {
    const invitation = await this.findByToken(rawToken);
    const status = effectiveStatus(invitation.status, invitation.expiresAt);

    if (status === 'ACCEPTED' || status === 'REVOKED') {
      throw new GoneException('Cette invitation a déjà été utilisée ou annulée');
    }
    if (status === 'EXPIRED') {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new GoneException('Cette invitation a expiré');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });

    let user = existingUser;
    let passwordHash: string | undefined;

    if (user) {
      const valid = await verify(user.passwordHash, dto.password);
      if (!valid) {
        throw new UnauthorizedException('Mot de passe incorrect pour ce compte');
      }
    } else {
      const firstName = dto.firstName?.trim() || invitation.firstName;
      const lastName = dto.lastName?.trim() || invitation.lastName;

      if (!firstName || !lastName) {
        throw new ConflictException('Prénom et nom sont requis pour créer le compte');
      }
      passwordHash = await hash(dto.password, ARGON_OPTIONS);
      user = await this.prisma.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          firstName,
          lastName,
        },
      });
    }

    const userId = user.id;

    await this.prisma.$transaction(async (tx) => {
      // Verrou logique : un seul acceptant possible.
      const claimed = await tx.invitation.updateMany({
        where: { id: invitation.id, status: 'PENDING' },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new GoneException('Cette invitation a déjà été utilisée ou annulée');
      }

      await ensureMembership(tx, {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
      });

      if (invitation.courseId) {
        const enrollment = await tx.enrollment.findUnique({
          where: { courseId_userId: { courseId: invitation.courseId, userId } },
          select: { id: true },
        });
        if (!enrollment) {
          await tx.enrollment.create({
            data: {
              organizationId: invitation.organizationId,
              courseId: invitation.courseId,
              userId,
              status: 'ACTIVE',
            },
          });
        }
      }

      // Les autres invitations en attente pour cet email deviennent caduques.
      await tx.invitation.updateMany({
        where: {
          organizationId: invitation.organizationId,
          email: invitation.email,
          status: 'PENDING',
          id: { not: invitation.id },
        },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });

      await tx.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    });

    const pair: TokenPair = await this.tokens.issuePair(
      {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      meta,
    );

    const memberships = await this.prisma.membership.findMany({
      where: { userId, organization: { isActive: true } },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      ...pair,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
      organizations: memberships.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: membership.role,
      })),
      activeOrganizationId: invitation.organizationId,
    };
  }

  private async findOwned(tenant: TenantContext, id: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id, organizationId: tenant.organizationId },
      include: INVITATION_INCLUDE,
    });
    if (!invitation) throw new NotFoundException('Invitation introuvable');
    return invitation;
  }

  private async findByToken(
    rawToken: string,
  ): Promise<InvitationOwner & { organizationName: string; courseTitle: string | null; invitedByName: string }> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: sha256(rawToken.trim()) },
      include: {
        organization: { select: { name: true } },
        course: { select: { title: true } },
        invitedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!invitation) throw new NotFoundException('Invitation introuvable');

    return {
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: invitation.role,
      courseId: invitation.courseId,
      tokenHash: invitation.tokenHash,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organizationName: invitation.organization.name,
      courseTitle: invitation.course?.title ?? null,
      invitedByName: `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`,
    };
  }

  private acceptUrl(rawToken: string): string {
    // WEB_ORIGIN peut être une liste CORS : le premier domaine est l'URL publique.
    const raw = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const origin = raw.split(',')[0].trim().replace(/\/$/, '');
    return `${origin}/invite/${rawToken}`;
  }

  private serialize(invitation: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: Role;
    status: InvitationStatus;
    expiresAt: Date;
    createdAt: Date;
    course: { id: string; title: string; slug: string } | null;
    invitedBy: { id: string; firstName: string; lastName: string };
  }) {
    return {
      id: invitation.id,
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: invitation.role,
      status: effectiveStatus(invitation.status, invitation.expiresAt),
      course: invitation.course,
      invitedBy: invitation.invitedBy,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }
}

type Tx = Prisma.TransactionClient | PrismaClient;

async function ensureMembership(
  tx: Tx,
  input: { organizationId: string; userId: string; role: Role },
): Promise<void> {
  const existing = await tx.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
    select: { id: true },
  });

  if (!existing) {
    await tx.membership.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        role: input.role,
      },
    });
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function effectiveStatus(status: InvitationStatus, expiresAt: Date): InvitationStatus {
  if (status === 'PENDING' && expiresAt.getTime() < Date.now()) return 'EXPIRED';
  return status;
}
