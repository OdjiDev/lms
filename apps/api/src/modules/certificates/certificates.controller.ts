import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Tenant } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipTenant } from '../../common/decorators/skip-tenant.decorator';
import type { AuthUser, TenantContext } from '../../common/types/request';
import { CertificatesService } from './certificates.service';

@ApiTags('certificates')
@ApiBearerAuth()
@Controller()
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get('me/certificates')
  mine(@Tenant() tenant: TenantContext, @CurrentUser() user: AuthUser) {
    return this.certificates.mine(tenant, user.id);
  }

  /** Vérification publique — déclarée avant `certificates/:id`. */
  @Public()
  @SkipTenant()
  @Get('certificates/verify/:serial')
  verify(@Param('serial') serial: string) {
    return this.certificates.verify(serial);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Get('courses/:courseId/certificates')
  byCourse(
    @Tenant() tenant: TenantContext,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.certificates.byCourse(tenant, courseId);
  }

  @Get('certificates/:id')
  findOne(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.certificates.findOne(tenant, user.id, id);
  }
}
