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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SystemRole } from '../../common/enums';

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
