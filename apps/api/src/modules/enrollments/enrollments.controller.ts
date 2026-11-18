import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Tenant } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser, TenantContext } from '../../common/types/request';
import { EnrollmentsService } from './enrollments.service';

@ApiTags('enrollments')
@ApiBearerAuth()
@Controller()
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Get('me/enrollments')
  mine(@Tenant() tenant: TenantContext, @CurrentUser() user: AuthUser) {
    return this.enrollments.mine(tenant, user.id);
  }

  @Post('courses/:courseId/enroll')
  enroll(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.enrollments.enroll(tenant, user.id, courseId);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Get('courses/:courseId/enrollments')
  courseEnrollments(
    @Tenant() tenant: TenantContext,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.enrollments.courseEnrollments(tenant, courseId);
  }

  @Get('courses/:courseId/my-progress')
  myProgress(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.enrollments.myProgress(tenant, user.id, courseId);
  }

  @Delete('enrollments/:id')
  cancel(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.enrollments.cancel(tenant, user.id, id);
  }

  @HttpCode(200)
  @Post('lessons/:lessonId/complete')
  complete(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.enrollments.setLessonCompletion(tenant, user.id, lessonId, true);
  }

  @HttpCode(200)
  @Delete('lessons/:lessonId/complete')
  uncomplete(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.enrollments.setLessonCompletion(tenant, user.id, lessonId, false);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Get('stats')
  stats(@Tenant() tenant: TenantContext) {
    return this.enrollments.orgStats(tenant);
  }
}
