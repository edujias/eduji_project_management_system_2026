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
    @Body() body: { status: string },
  ) {
    return this.tasksService.updateTaskStatus(taskId, body.status);
  }

  @Patch(':taskId')
  @UseGuards(ProjectAccessGuard)
  @RequireProjectPermission(ProjectPermissionLevel.WRITE)
  async updateTask(
    @Param('taskId') taskId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.tasksService.updateTask(taskId, body, req.user.id);
  }

  @Patch(':taskId/complete')
  @UseGuards(ProjectAccessGuard)
  @RequireProjectPermission(ProjectPermissionLevel.WRITE)
  async completeTask(@Param('taskId') taskId: string, @Request() req: any) {
    return this.tasksService.completeTask(taskId, req.user.id);
  }

  @Patch(':taskId/approve')
  @UseGuards(ProjectAccessGuard)
  @RequireProjectPermission(ProjectPermissionLevel.WRITE)
  async approveTask(@Param('taskId') taskId: string, @Request() req: any) {
    return this.tasksService.approveTask(taskId, { id: req.user.id, role: req.user.role });
  }

  @Patch(':taskId/reject')
  @UseGuards(ProjectAccessGuard)
  @RequireProjectPermission(ProjectPermissionLevel.WRITE)
  async rejectTask(@Param('taskId') taskId: string, @Request() req: any) {
    return this.tasksService.rejectTask(taskId, { id: req.user.id, role: req.user.role });
  }

  @Patch(':taskId/delegate')
  @UseGuards(ProjectAccessGuard)
  @RequireProjectPermission(ProjectPermissionLevel.WRITE)
  async delegateTask(
    @Param('taskId') taskId: string,
    @Body() body: { toUserId: string },
    @Request() req: any,
  ) {
    return this.tasksService.delegateTask(taskId, req.user.id, body.toUserId);
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
