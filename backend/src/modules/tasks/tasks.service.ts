import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async getProjectTasks(projectId: string) {
    return this.prisma.task.findMany({
      where: { projectId },
      include: {
        assignedTo: { select: { id: true, fullName: true, avatarUrl: true, email: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTask(projectId: string, data: any, creatorId: string) {
    return this.prisma.task.create({
      data: {
        projectId,
        title: data.title,
        description: data.description,
        status: data.status || 'TODO',
        priority: data.priority || 'MEDIUM',
        assignedToId: data.assignedToId || null,
        createdById: creatorId,
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
  }

  async updateTaskStatus(taskId: string, status: string, assignedToId?: string) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        assignedToId: assignedToId !== undefined ? assignedToId : undefined,
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
  }

  async deleteTask(taskId: string) {
    return this.prisma.task.delete({
      where: { id: taskId },
    });
  }

  // GEMINI AI OTOMATİK KANBAN GÖREV OLUŞTURUCU
  async generateAiTasksForProject(projectId: string, creatorId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) throw new NotFoundException('Proje bulunamadı.');

    const aiUser = await this.prisma.user.findUnique({
      where: { email: 'gemini@company.com' },
    });

    const aiUserId = aiUser ? aiUser.id : creatorId;

    const demoTasks = [
      {
        title: '🔒 ACL Yetkilendirme & Güvenlik Testi',
        description: 'Projede Admin ve Employee kullanıcıları arasındaki READ/WRITE yetki sınırlarının doğrulanması.',
        status: 'DONE',
        priority: 'URGENT',
      },
      {
        title: '🌐 Socket.io Canlı Mesajlaşma Odası Entegrasyonu',
        description: 'Proje kanallarındaki anlık mesaj iletimi ve Gemini AI otomatik yanıt mekanizmasının yayına alınması.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
      },
      {
        title: '📂 AWS S3 / Cloudflare R2 Nesne Depolama Testi',
        description: 'Dosya yükleme presigned URL üretimi ve doküman önizleme ekranının kurulması.',
        status: 'TODO',
        priority: 'MEDIUM',
      },
      {
        title: '📊 Proje Analitiği ve Haftalık Raporlama',
        description: 'Gemini AI ile haftalık çalışma özeti ve tamamlanma oranlarının çıkarılması.',
        status: 'TODO',
        priority: 'LOW',
      },
    ];

    const createdTasks = [];
    for (const t of demoTasks) {
      const task = await this.prisma.task.create({
        data: {
          projectId,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          assignedToId: aiUserId,
          createdById: creatorId,
        },
        include: {
          assignedTo: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      });
      createdTasks.push(task);
    }

    return createdTasks;
  }
}
