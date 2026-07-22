import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, AssignPermissionDto } from './dto/project.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ProjectAccessGuard } from './guards/project-access.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RequireProjectPermission } from 'src/common/decorators/require-project-permission.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ProjectPermissionLevel, SystemRole } from 'src/common/enums';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard, ProjectAccessGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(SystemRole.ADMIN)
  async createProject(@Body() dto: CreateProjectDto, @CurrentUser('id') creatorId: string) {
    return this.projectsService.createProject(dto, creatorId);
  }

  @Get()
  async getUserProjects(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: SystemRole,
  ) {
    return this.projectsService.getUserProjects(userId, userRole);
  }

  @Get(':projectId')
  @RequireProjectPermission(ProjectPermissionLevel.READ)
  async getProjectById(@Param('projectId') projectId: string) {
    return this.projectsService.getProjectById(projectId);
  }

  @Patch(':projectId')
  @Roles(SystemRole.ADMIN)
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() dto: { name: string; description?: string },
  ) {
    return this.projectsService.updateProject(projectId, dto);
  }

  @Post(':projectId/permissions')
  @Roles(SystemRole.ADMIN)
  async assignPermission(
    @Param('projectId') projectId: string,
    @Body() dto: AssignPermissionDto,
  ) {
    return this.projectsService.assignPermission(projectId, dto);
  }

  @Delete(':projectId/permissions/:userId')
  @Roles(SystemRole.ADMIN)
  async removePermission(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    return this.projectsService.removePermission(projectId, userId);
  }
}
