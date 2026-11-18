import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { AccessTokenPayload } from '../../common/types/request';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface TokenOwner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface TokenMeta {
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async issuePair(owner: TokenOwner, meta: TokenMeta = {}): Promise<TokenPair> {
    const payload: AccessTokenPayload = {
      sub: owner.id,
      email: owner.email,
      firstName: owner.firstName,
      lastName: owner.lastName,
      type: 'access',
    };

    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessTtl as JwtSignOptions['expiresIn'],
    });

    const refreshToken = randomBytes(48).toString('base64url');
    const ttlDays = this.config.get<number>('JWT_REFRESH_TTL_DAYS') ?? 30;

    await this.prisma.refreshToken.create({
      data: {
        userId: owner.id,
        tokenHash: TokenService.hash(refreshToken),
        expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
        userAgent: meta.userAgent?.slice(0, 255),
        ip: meta.ip,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: parseDurationToSeconds(accessTtl),
    };
  }

  /**
   * Rotation + détection de réutilisation :
   * un refresh token déjà consommé révoque toutes les sessions de l'utilisateur.
   */
  async rotate(refreshToken: string, meta: TokenMeta = {}): Promise<TokenPair> {
    const tokenHash = TokenService.hash(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Session invalide');
    }

    const consumed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (consumed.count === 0) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Session réutilisée : reconnectez-vous');
    }

    if (stored.expiresAt.getTime() < Date.now() || !stored.user.isActive) {
      throw new UnauthorizedException('Session expirée');
    }

    return this.issuePair(
      {
        id: stored.user.id,
        email: stored.user.email,
        firstName: stored.user.firstName,
        lastName: stored.user.lastName,
      },
      meta,
    );
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: TokenService.hash(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/i.exec(value.trim());
  if (!match) return 900;
  const amount = Number(match[1]);
  const unit = (match[2] ?? 's').toLowerCase();
  const factor = unit === 'm' ? 60 : unit === 'h' ? 3600 : unit === 'd' ? 86400 : 1;
  return amount * factor;
}
