import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProjectAccessGuard } from '../projects/guards/project-access.guard';
import { RequireProjectPermission } from '../../common/decorators/require-project-permission.decorator';
import { ProjectPermissionLevel } from '../../common/enums';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get('project/:projectId')
  @UseGuards(ProjectAccessGuard)
  @RequireProjectPermission(ProjectPermissionLevel.READ)
  async getProjectTasks(@Param('projectId') projectId: string) {
    return this.tasksService.getProjectTasks(projectId);
  }

  @Post('project/:projectId')
  @UseGuards(ProjectAccessGuard)
  @RequireProjectPermission(ProjectPermissionLevel.WRITE)
  async createTask(
    @Param('projectId') projectId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.tasksService.createTask(projectId, body, req.user.id, req.user.fullName);
  }

  @Patch(':taskId/status')
  @UseGuards(ProjectAccessGuard)
  @RequireProjectPermission(ProjectPermissionLevel.WRITE)
  async updateStatus(
    @Param('taskId') taskId: string,
    @Body() body: { status: string; assignedToId?: string },
  ) {
    return this.tasksService.updateTaskStatus(taskId, body.status, body.assignedToId);
  }

  @Patch(':taskId')
  @UseGuards(ProjectAccessGuard)
  @RequireProjectPermission(ProjectPermissionLevel.WRITE)
  async updateTask(
    @Param('taskId') taskId: string,
    @Body() body: any,
  ) {
    return this.tasksService.updateTask(taskId, body);
  }

  @Delete(':taskId')
  @UseGuards(ProjectAccessGuard)
  @RequireProjectPermission(ProjectPermissionLevel.WRITE)
  async deleteTask(@Param('taskId') taskId: string) {
    return this.tasksService.deleteTask(taskId);
  }

  @Post('project/:projectId/ai-generate')
  @UseGuards(ProjectAccessGuard)
  @RequireProjectPermission(ProjectPermissionLevel.WRITE)
  async generateAiTasks(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    return this.tasksService.generateAiTasksForProject(projectId, req.user.id);
  }
}
