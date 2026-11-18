import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpsertQuizDto {
  @ApiPropertyOptional({ description: 'Score minimum de réussite, en pourcentage', default: 70 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passingScore?: number;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 'Quel est le premier jour de la période d’onboarding ?' })
  @IsString()
  @Length(3, 500)
  prompt!: string;

  @ApiProperty({
    description: 'Propositions (2 à 6). L’ordre définit les identifiants o0, o1…',
    example: ['Jour 1', 'Jour 30', 'Jour 90'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @Length(1, 300, { each: true })
  options!: string[];

  @ApiProperty({ description: 'Index de la bonne réponse dans `options`', example: 0 })
  @IsInt()
  @Min(0)
  @Max(5)
  correctIndex!: number;

  @ApiPropertyOptional({ description: 'Explication affichée après correction' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  explanation?: string;
}

export class SubmitQuizDto {
  @ApiProperty({
    description: 'Réponses : { [questionId]: optionId }',
    example: { 'a1b2c3': 'o0' },
  })
  @IsObject()
  answers!: Record<string, string>;
}
