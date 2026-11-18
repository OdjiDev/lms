import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { SKIP_TENANT_KEY } from '../decorators/skip-tenant.decorator';
import type { RequestWithAuth } from '../types/request';

/**
 * Résout l'organisation active de la requête.
 *
 * Priorité : header `X-Org-Id` (switch d'organisation côté client)
 *            sinon première organisation de l'utilisateur.
 * L'appartenance est TOUJOURS revérifiée en base : le header n'est pas une preuve.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const userId = request.user?.id;
    if (!userId) return true; // route publique : gérée par JwtAuthGuard

    const requestedOrgId = request.headers['x-org-id'];
    const organizationId = typeof requestedOrgId === 'string' ? requestedOrgId : undefined;

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        ...(organizationId ? { organizationId } : {}),
        organization: { isActive: true },
      },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!membership) {
      throw new ForbiddenException(
        organizationId
          ? 'Vous n’êtes pas membre de cette organisation'
          : 'Aucune organisation active pour cet utilisateur',
      );
    }

    request.tenant = {
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      organizationSlug: membership.organization.slug,
      membershipId: membership.id,
      role: membership.role,
    };

    return true;
  }
}
