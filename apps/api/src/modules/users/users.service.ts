import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { TenantContext } from '../../common/types/request';
import { UpdateProfileDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  updateMe(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        locale: true,
      },
    });
  }

  /** Annuaire des membres de l'organisation active. */
  members(tenant: TenantContext) {
    return this.prisma.membership.findMany({
      where: { organizationId: tenant.organizationId },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async changeRole(tenant: TenantContext, membershipId: string, role: Role) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId: tenant.organizationId },
    });
    if (!membership) throw new NotFoundException('Membre introuvable');

    // On ne retire pas le dernier OWNER de l'organisation.
    if (membership.role === Role.OWNER && role !== Role.OWNER) {
      const owners = await this.prisma.membership.count({
        where: { organizationId: tenant.organizationId, role: Role.OWNER },
      });
      if (owners <= 1) {
        throw new NotFoundException('Impossible de retirer le dernier propriétaire');
      }
    }

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { role },
      select: { id: true, role: true, userId: true },
    });
  }
}
