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

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get('project/:projectId')
  async getProjectTasks(@Param('projectId') projectId: string) {
    return this.tasksService.getProjectTasks(projectId);
  }

  @Post('project/:projectId')
  async createTask(
    @Param('projectId') projectId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.tasksService.createTask(projectId, body, req.user.id);
  }

  @Patch(':taskId/status')
  async updateStatus(
    @Param('taskId') taskId: string,
    @Body() body: { status: string; assignedToId?: string },
  ) {
    return this.tasksService.updateTaskStatus(taskId, body.status, body.assignedToId);
  }

  @Patch(':taskId')
  async updateTask(
    @Param('taskId') taskId: string,
    @Body() body: any,
  ) {
    return this.tasksService.updateTask(taskId, body);
  }

  @Delete(':taskId')
  async deleteTask(@Param('taskId') taskId: string) {
    return this.tasksService.deleteTask(taskId);
  }

  @Post('project/:projectId/ai-generate')
  async generateAiTasks(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    return this.tasksService.generateAiTasksForProject(projectId, req.user.id);
  }
}
