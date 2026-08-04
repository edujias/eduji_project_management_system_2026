import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';

@Module({
  controllers: [EvaluationsController],
  providers: [EvaluationsService, PrismaService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
