import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restreint la route à certains rôles DANS l'organisation active.
 * Sans ce décorateur, tout membre de l'organisation peut appeler la route.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
