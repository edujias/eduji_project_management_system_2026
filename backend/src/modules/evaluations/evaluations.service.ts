import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEvaluationDto } from './dto/evaluations.dto';

@Injectable()
export class EvaluationsService {
  constructor(private prisma: PrismaService) {}

  async upsertEvaluation(projectId: string, evaluatorId: string, dto: CreateEvaluationDto) {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Proje bulunamadı.');

    // Verify target user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('Çalışan bulunamadı.');

    // Create or update evaluation
    return this.prisma.dailyEvaluation.upsert({
      where: {
        projectId_userId_date: {
          projectId,
          userId: dto.userId,
          date: dto.date,
        },
      },
      update: {
        score: dto.score,
        feedback: dto.feedback,
        evaluatorId,
      },
      create: {
        projectId,
        userId: dto.userId,
        evaluatorId,
        score: dto.score,
        feedback: dto.feedback,
        date: dto.date,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        evaluator: { select: { id: true, fullName: true } },
      },
    });
  }

  async getProjectEvaluations(projectId: string, date?: string) {
    const whereClause: any = { projectId };
    if (date) {
      whereClause.date = date;
    }

    return this.prisma.dailyEvaluation.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        evaluator: { select: { id: true, fullName: true } },
      },
      orderBy: { date: 'desc' },
    });
  }
}
