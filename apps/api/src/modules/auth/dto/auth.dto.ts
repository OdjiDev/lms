import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Yellow Academy' })
  @IsString()
  @Length(2, 80)
  organizationName!: string;

  @ApiPropertyOptional({ example: 'yellow-academy' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Le slug doit être en minuscules, chiffres et tirets',
  })
  @Length(3, 40)
  organizationSlug?: string;

  @ApiProperty({ example: 'Awa' })
  @IsString()
  @Length(1, 60)
  firstName!: string;

  @ApiProperty({ example: 'Diallo' })
  @IsString()
  @Length(1, 60)
  lastName!: string;

  @ApiProperty({ example: 'awa@yellow.academy' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'MotDePasse123', minLength: 8 })
  @IsString()
  @Length(8, 128)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une lettre et un chiffre',
  })
  password!: string;

  @ApiPropertyOptional({ enum: ['fr', 'en'], default: 'fr' })
  @IsOptional()
  @IsIn(['fr', 'en'])
  locale?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'awa@yellow.academy' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'MotDePasse123' })
  @IsString()
  @Length(1, 128)
  password!: string;

  @ApiPropertyOptional({
    description: 'Si l’utilisateur appartient à plusieurs organisations.',
    example: 'yellow-academy',
  })
  @IsOptional()
  @IsString()
  organizationSlug?: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @Length(20, 200)
  refreshToken!: string;
}
