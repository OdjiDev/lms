import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser, RequestWithAuth, TenantContext } from '../types/request';

/** Utilisateur issu du JWT. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
    return request.user as AuthUser;
  },
);

/** Organisation active (résolue par TenantGuard). */
export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
    return request.tenant as TenantContext;
  },
);
