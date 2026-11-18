import type { Request } from 'express';
import type { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface TenantContext {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  membershipId: string;
  role: Role;
}

export interface RequestWithAuth extends Request {
  user?: AuthUser;
  tenant?: TenantContext;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  type: 'access';
}
