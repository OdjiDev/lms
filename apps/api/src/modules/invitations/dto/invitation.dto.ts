import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Rôles attribuables par invitation (OWNER ne peut pas être délégué). */
export const INVITABLE_ROLES = ['ADMIN', 'INSTRUCTOR', 'LEARNER'] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export class CreateInvitationDto {
  @IsEmail({}, { message: 'Adresse email invalide' })
  @MaxLength(190)
  email!: string;

  @IsOptional()
  @IsIn(INVITABLE_ROLES, { message: 'Rôle non autorisé' })
  role?: InvitableRole;

  /** Inscription automatique à ce cours dès l'acceptation. */
  @IsOptional()
  @IsUUID('4', { message: 'Cours invalide' })
  courseId?: string;
}

export class AcceptInvitationDto {
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  lastName?: string;
}

export class ListInvitationsQueryDto {
  @IsOptional()
  @Type(() => String)
  @IsIn(['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'])
  status?: string;
}
