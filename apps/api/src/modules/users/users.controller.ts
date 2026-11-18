import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Tenant } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipTenant } from '../../common/decorators/skip-tenant.decorator';
import type { AuthUser, TenantContext } from '../../common/types/request';
import { UpdateRoleDto } from './dto/role.dto';
import { UpdateProfileDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @SkipTenant()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user.id);
  }

  @SkipTenant()
  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateMe(user.id, dto);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Get()
  members(@Tenant() tenant: TenantContext) {
    return this.users.members(tenant);
  }

  @Roles('OWNER', 'ADMIN')
  @Patch(':membershipId/role')
  changeRole(
    @Tenant() tenant: TenantContext,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.users.changeRole(tenant, membershipId, dto.role as Role);
  }
}
