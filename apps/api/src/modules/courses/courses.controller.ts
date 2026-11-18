import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Tenant } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser, TenantContext } from '../../common/types/request';
import { CoursesService } from './courses.service';
import {
  CreateCourseDto,
  CreateLessonDto,
  CreateModuleDto,
  ListCoursesQueryDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateModuleDto,
} from './dto/course.dto';

@ApiTags('courses')
@ApiBearerAuth()
@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list(@Tenant() tenant: TenantContext, @Query() query: ListCoursesQueryDto) {
    return this.courses.list(tenant, query);
  }

  @Get(':id')
  findOne(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.courses.findOne(tenant, id);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Post()
  create(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCourseDto,
  ) {
    return this.courses.create(tenant, user.id, dto);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Patch(':id')
  update(
    @Tenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.courses.update(tenant, id, dto);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Post(':id/publish')
  publish(@Tenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.courses.publish(tenant, id);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Post(':id/archive')
  archive(@Tenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.courses.archive(tenant, id);
  }

  @Roles('OWNER', 'ADMIN')
  @Delete(':id')
  remove(@Tenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.courses.remove(tenant, id);
  }

  // ──────────────────────────── Programme ──────────────────────────

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Post(':courseId/modules')
  addModule(
    @Tenant() tenant: TenantContext,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateModuleDto,
  ) {
    return this.courses.addModule(tenant, courseId, dto);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Patch('modules/:moduleId')
  updateModule(
    @Tenant() tenant: TenantContext,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.courses.updateModule(tenant, moduleId, dto);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Delete('modules/:moduleId')
  removeModule(
    @Tenant() tenant: TenantContext,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    return this.courses.removeModule(tenant, moduleId);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Post('modules/:moduleId/lessons')
  addLesson(
    @Tenant() tenant: TenantContext,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.courses.addLesson(tenant, moduleId, dto);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Patch('lessons/:lessonId')
  updateLesson(
    @Tenant() tenant: TenantContext,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.courses.updateLesson(tenant, lessonId, dto);
  }

  @Roles('OWNER', 'ADMIN', 'INSTRUCTOR')
  @Delete('lessons/:lessonId')
  removeLesson(
    @Tenant() tenant: TenantContext,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.courses.removeLesson(tenant, lessonId);
  }
}
