import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CourseLevel, CourseStatus, LessonType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'Fondamentaux de la gestion de projet' })
  @IsString()
  @Length(3, 140)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 280)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  coverUrl?: string;

  @ApiPropertyOptional({ enum: CourseLevel })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiPropertyOptional({ example: 'fr' })
  @IsOptional()
  @IsString()
  @Length(2, 5)
  language?: string;

  @ApiPropertyOptional({ description: 'Durée estimée en minutes', example: 180 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  durationMin?: number;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class ListCoursesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @ApiPropertyOptional({ enum: CourseStatus })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class CreateModuleDto {
  @ApiProperty({ example: 'Module 1 — Cadrage' })
  @IsString()
  @Length(2, 140)
  title!: string;

  @ApiPropertyOptional({ description: 'Position (0-based). Auto en fin de cours si omis.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateModuleDto extends PartialType(CreateModuleDto) {}

export class CreateLessonDto {
  @ApiProperty({ example: 'Définir le périmètre du projet' })
  @IsString()
  @Length(2, 160)
  title!: string;

  @ApiPropertyOptional({ enum: LessonType, default: LessonType.VIDEO })
  @IsOptional()
  @IsEnum(LessonType)
  type?: LessonType;

  @ApiPropertyOptional({ description: 'Contenu structuré (texte, blocs, questions…)' })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  videoUrl?: string;

  @ApiPropertyOptional({ example: 480 })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSec?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ description: 'Visible sans inscription (extrait gratuit)' })
  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;
}

export class UpdateLessonDto extends PartialType(CreateLessonDto) {}
