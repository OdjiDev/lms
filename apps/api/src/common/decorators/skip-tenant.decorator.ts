import { SetMetadata } from '@nestjs/common';

export const SKIP_TENANT_KEY = 'skipTenant';

/**
 * Route authentifiée mais non rattachée à une organisation
 * (ex. /auth/me qui liste justement les organisations de l'utilisateur).
 */
export const SkipTenant = () => SetMetadata(SKIP_TENANT_KEY, true);
