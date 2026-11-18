import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Tenant } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser, TenantContext } from '../../common/types/request';
import { CreateQuestionDto, SubmitQuizDto, UpsertQuizDto } from './dto/quiz.dto';
import { QuizzesService } from './quizzes.service';

@ApiTags('quizzes')
@ApiBearerAuth()
@Controller()
export class QuizzesController {
  constructor(private readonly quizzes: QuizzesService) {}

  /**
   * Vue apprenant : jamais de bonne réponse ni d'explication avant correction.
   * Le staff utilise `.../quiz/edit` pour la version complète.
   */
  @Get('lessons/:lessonId/quiz')
  find(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.quizzes.findForLearner(tenant, user.id, lessonId);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Get('lessons/:lessonId/quiz/edit')
  findForStaff(
    @Tenant() tenant: TenantContext,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.quizzes.findForStaff(tenant, lessonId);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Put('lessons/:lessonId/quiz')
  upsert(
    @Tenant() tenant: TenantContext,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpsertQuizDto,
  ) {
    return this.quizzes.upsert(tenant, lessonId, dto);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Post('lessons/:lessonId/quiz/questions')
  addQuestion(
    @Tenant() tenant: TenantContext,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.quizzes.addQuestion(tenant, lessonId, dto);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Delete('quiz-questions/:questionId')
  removeQuestion(
    @Tenant() tenant: TenantContext,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    return this.quizzes.removeQuestion(tenant, questionId);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Delete('lessons/:lessonId/quiz')
  remove(
    @Tenant() tenant: TenantContext,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.quizzes.remove(tenant, lessonId);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Get('lessons/:lessonId/quiz/results')
  results(
    @Tenant() tenant: TenantContext,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.quizzes.results(tenant, lessonId);
  }

  @HttpCode(200)
  @Post('lessons/:lessonId/quiz/attempts')
  submit(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.quizzes.submit(tenant, user.id, lessonId, dto);
  }

  @Get('lessons/:lessonId/quiz/attempts/me')
  myAttempts(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.quizzes.findForLearner(tenant, user.id, lessonId);
  }
}
