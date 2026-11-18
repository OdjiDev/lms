import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Tenant } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { TenantContext } from '../../common/types/request';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateOrganizationDto } from './dto/organization.dto';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('current')
  current(@Tenant() tenant: TenantContext) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: tenant.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        locale: true,
        createdAt: true,
        _count: { select: { memberships: true, courses: true } },
      },
    });
  }

  @Roles('OWNER', 'ADMIN')
  @Patch('current')
  update(@Tenant() tenant: TenantContext, @Body() dto: UpdateOrganizationDto) {
    return this.prisma.organization.update({
      where: { id: tenant.organizationId },
      data: dto,
      select: { id: true, name: true, slug: true, logoUrl: true, locale: true },
    });
  }
}
