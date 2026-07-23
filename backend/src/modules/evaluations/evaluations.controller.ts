import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationDto } from './dto/evaluations.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { SystemRole } from 'src/common/enums';

@Controller('projects/:projectId/evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post()
  @Roles(SystemRole.ADMIN)
  async createOrUpdateEvaluation(
    @Param('projectId') projectId: string,
    @CurrentUser('id') evaluatorId: string,
    @Body() dto: CreateEvaluationDto,
  ) {
    return this.evaluationsService.upsertEvaluation(projectId, evaluatorId, dto);
  }

  @Get()
  async getProjectEvaluations(
    @Param('projectId') projectId: string,
    @Query('date') date?: string,
  ) {
    return this.evaluationsService.getProjectEvaluations(projectId, date);
  }
}
