import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser, Tenant } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipTenant } from '../../common/decorators/skip-tenant.decorator';
import type { AuthUser, TenantContext } from '../../common/types/request';
import { AcceptInvitationDto, CreateInvitationDto, ImportInvitationsDto } from './dto/invitation.dto';
import { InvitationsService } from './invitations.service';

function metaFrom(request: Request) {
  return { userAgent: request.headers['user-agent'], ip: request.ip };
}

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Get()
  list(@Tenant() tenant: TenantContext) {
    return this.invitations.list(tenant);
  }

  @Roles('OWNER', 'ADMIN')
  @Post()
  create(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitations.create(tenant, user.id, dto);
  }

  @Roles('OWNER', 'ADMIN')
  @Post('import')
  importCsv(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportInvitationsDto,
  ) {
    return this.invitations.importCsv(tenant, user.id, dto);
  }

  @Roles('OWNER', 'ADMIN')
  @Post(':id/resend')
  resend(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.invitations.resend(tenant, id);
  }

  @Roles('OWNER', 'ADMIN')
  @Delete(':id')
  revoke(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.invitations.revoke(tenant, id);
  }

  /** Aperçu public : le jeton reçu par email fait office de preuve. */
  @Public()
  @SkipTenant()
  @Get(':token')
  preview(@Param('token') token: string) {
    return this.invitations.preview(token);
  }

  @Public()
  @SkipTenant()
  @HttpCode(200)
  @Post(':token/accept')
  accept(
    @Param('token') token: string,
    @Body() dto: AcceptInvitationDto,
    @Req() request: Request,
  ) {
    return this.invitations.accept(token, dto, metaFrom(request));
  }
}
