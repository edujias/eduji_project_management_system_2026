import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ProjectAccessGuard } from 'src/modules/projects/guards/project-access.guard';
import { RequireProjectPermission } from 'src/common/decorators/require-project-permission.decorator';
import { ProjectPermissionLevel } from 'src/common/enums';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('roadmap/:projectId')
  @UseGuards(ProjectAccessGuard)
  @RequireProjectPermission(ProjectPermissionLevel.READ)
  async generateRoadmap(@Param('projectId') projectId: string) {
    return this.aiService.generateProjectRoadmap(projectId);
  }

  @Post('analyze-file/:fileId')
  async analyzeFile(@Param('fileId') fileId: string) {
    return this.aiService.analyzeFileAsset(fileId);
  }
}
