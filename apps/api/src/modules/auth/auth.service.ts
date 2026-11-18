import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../../common/utils/slug';
import type { TokenMeta } from './auth.types';
import { TokenService, type TokenPair } from './token.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { hash, verify } from '@node-rs/argon2';

const ARGON_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export interface SessionResponse extends TokenPair {
  user: { id: string; email: string; firstName: string; lastName: string; avatarUrl: string | null };
  organizations: Array<{ id: string; name: string; slug: string; role: string }>;
  activeOrganizationId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  /** Bootstrap : crée l'organisation et son premier OWNER. */
  async register(dto: RegisterDto, meta: TokenMeta): Promise<SessionResponse> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    const slug = await this.uniqueSlug(dto.organizationSlug ?? slugify(dto.organizationName));
    const passwordHash = await hash(dto.password, ARGON_OPTIONS);

    const { user, membership } = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName.trim(),
          slug,
          locale: dto.locale ?? 'fr',
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          locale: dto.locale ?? 'fr',
          lastLoginAt: new Date(),
        },
      });

      const membership = await tx.membership.create({
        data: { organizationId: organization.id, userId: user.id, role: 'OWNER' },
        include: { organization: true },
      });

      return { user, membership };
    });

    const pair = await this.tokens.issuePair(user, meta);

    return {
      ...pair,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
      organizations: [
        {
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
          role: membership.role,
        },
      ],
      activeOrganizationId: membership.organizationId,
    };
  }

  async login(dto: LoginDto, meta: TokenMeta): Promise<SessionResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Message volontairement identique : pas d'énumération de comptes.
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const valid = await verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id, organization: { isActive: true } },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });

    if (memberships.length === 0) {
      throw new ForbiddenException('Aucune organisation active pour ce compte');
    }

    const active = dto.organizationSlug
      ? memberships.find((m) => m.organization.slug === dto.organizationSlug)
      : memberships[0];

    if (!active) {
      throw new ForbiddenException('Vous n’appartenez pas à cette organisation');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const pair = await this.tokens.issuePair(user, meta);

    return {
      ...pair,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
      activeOrganizationId: active.organizationId,
    };
  }

  refresh(refreshToken: string, meta: TokenMeta): Promise<TokenPair> {
    return this.tokens.rotate(refreshToken, meta);
  }

  async logout(refreshToken: string): Promise<{ success: true }> {
    await this.tokens.revoke(refreshToken);
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        locale: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            organization: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Utilisateur introuvable');
    return user;
  }

  private async uniqueSlug(base: string): Promise<string> {
    const root = base || 'organisation';
    let candidate = root;
    let suffix = 2;

    // Le slug d'organisation est public : on garantit son unicité.
    while (await this.prisma.organization.findUnique({ where: { slug: candidate } })) {
      candidate = `${root}-${suffix++}`;
    }
    return candidate;
  }
}
