import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, SystemRole, TaskStatus } from '../../common/enums';

const TASK_INCLUDE = {
  assignedTo: { select: { id: true, fullName: true, avatarUrl: true, email: true } },
  assignedBy: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
  createdBy: { select: { id: true, fullName: true } },
};

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private notificationsService: NotificationsService,
  ) {}

  async getProjectTasks(projectId: string) {
    return this.prisma.task.findMany({
      where: { projectId },
      include: TASK_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTask(projectId: string, data: any, creatorId: string, creatorName: string) {
    const task = await this.prisma.task.create({
      data: {
        projectId,
        title: data.title,
        description: data.description,
        status: data.status || TaskStatus.TODO,
        priority: data.priority || 'MEDIUM',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedToId: data.assignedToId || null,
        assignedById: data.assignedToId ? creatorId : null,
        createdById: creatorId,
      },
      include: TASK_INCLUDE,
    });

    this.notificationsService
      .notifyTaskCreated(projectId, task, creatorId, creatorName)
      .catch((err) => console.error('Görev bildirimi gönderilirken hata oluştu:', err));

    if (data.assignedToId && data.assignedToId !== creatorId) {
      this.notifyAssignment(task, creatorName).catch((err) =>
        console.error('Görev atama bildirimi gönderilirken hata oluştu:', err),
      );
    }

    return task;
  }

  // Sürükle-bırak / hızlı taşıma: sadece TODO <-> IN_PROGRESS arası, onay zincirini bypass edemez
  async updateTaskStatus(taskId: string, status: string) {
    if (status !== TaskStatus.TODO && status !== TaskStatus.IN_PROGRESS) {
      throw new ForbiddenException(
        'Bu duruma sadece ilgili onay/tamamlama işlemleriyle geçilebilir.',
      );
    }
    return this.prisma.task.update({
      where: { id: taskId },
      data: { status },
      include: TASK_INCLUDE,
    });
  }

  async updateTask(taskId: string, data: any, actorId: string) {
    const existing = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) throw new NotFoundException('Görev bulunamadı.');

    const assignmentChanged =
      data.assignedToId !== undefined && data.assignedToId !== existing.assignedToId;

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedToId: data.assignedToId !== undefined ? data.assignedToId || null : undefined,
        assignedById: assignmentChanged ? (data.assignedToId ? actorId : null) : undefined,
      },
      include: TASK_INCLUDE,
    });
  }

  async deleteTask(taskId: string) {
    return this.prisma.task.delete({
      where: { id: taskId },
    });
  }

  async completeTask(taskId: string, actorId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignedBy: true },
    });
    if (!task) throw new NotFoundException('Görev bulunamadı.');
    if (task.assignedToId !== actorId) {
      throw new ForbiddenException('Bu görevi sadece atanan kişi tamamlanmış olarak işaretleyebilir.');
    }

    const skipsPeerApproval =
      !task.assignedBy || task.assignedBy.role === SystemRole.ADMIN || task.assignedById === actorId;
    const nextStatus = skipsPeerApproval ? TaskStatus.REVIEW : TaskStatus.PENDING_APPROVAL;

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: nextStatus },
      include: TASK_INCLUDE,
    });

    if (skipsPeerApproval) {
      this.notifyAdmins(updated, 'incelemenizi bekliyor').catch((err) =>
        console.error('Görev inceleme bildirimi gönderilirken hata oluştu:', err),
      );
    } else if (task.assignedById) {
      this.notificationsService
        .create(task.assignedById, {
          actorId,
          type: NotificationType.TASK_APPROVAL_NEEDED,
          title: `${updated.assignedTo?.fullName} bir görevi tamamladı, onayınızı bekliyor`,
          body: updated.title,
          entityType: 'project',
          entityId: updated.projectId,
        })
        .catch((err) => console.error('Görev onay bildirimi gönderilirken hata oluştu:', err));
    }

    return updated;
  }

  async approveTask(taskId: string, actor: { id: string; role: string }) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Görev bulunamadı.');

    if (task.status === TaskStatus.PENDING_APPROVAL) {
      if (task.assignedById !== actor.id) {
        throw new ForbiddenException('Bu görevi sadece ataması yapan kişi onaylayabilir.');
      }
      const updated = await this.prisma.task.update({
        where: { id: taskId },
        data: { status: TaskStatus.REVIEW },
        include: TASK_INCLUDE,
      });
      this.notifyAdmins(updated, 'incelemenizi bekliyor').catch((err) =>
        console.error('Görev inceleme bildirimi gönderilirken hata oluştu:', err),
      );
      return updated;
    }

    if (task.status === TaskStatus.REVIEW) {
      if (actor.role !== SystemRole.ADMIN) {
        throw new ForbiddenException('Bu aşamadaki bir görevi sadece yöneticiler onaylayabilir.');
      }
      const updated = await this.prisma.task.update({
        where: { id: taskId },
        data: { status: TaskStatus.DONE },
        include: TASK_INCLUDE,
      });
      if (updated.assignedToId) {
        this.notificationsService
          .create(updated.assignedToId, {
            actorId: actor.id,
            type: NotificationType.TASK_APPROVED,
            title: 'Göreviniz onaylandı ve tamamlandı olarak işaretlendi',
            body: updated.title,
            entityType: 'project',
            entityId: updated.projectId,
          })
          .catch((err) => console.error('Görev onay bildirimi gönderilirken hata oluştu:', err));
      }
      return updated;
    }

    throw new ForbiddenException('Bu görev şu an onay bekleyen bir aşamada değil.');
  }

  async rejectTask(taskId: string, actor: { id: string; role: string }) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Görev bulunamadı.');

    const isPeerApprover =
      task.status === TaskStatus.PENDING_APPROVAL && task.assignedById === actor.id;
    const isAdminReview = task.status === TaskStatus.REVIEW && actor.role === SystemRole.ADMIN;

    if (!isPeerApprover && !isAdminReview) {
      throw new ForbiddenException('Bu görevi reddetme yetkiniz yok.');
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.IN_PROGRESS },
      include: TASK_INCLUDE,
    });

    if (updated.assignedToId) {
      this.notificationsService
        .create(updated.assignedToId, {
          actorId: actor.id,
          type: NotificationType.TASK_REJECTED,
          title: 'Göreviniz reddedildi, tekrar gözden geçirmeniz gerekiyor',
          body: updated.title,
          entityType: 'project',
          entityId: updated.projectId,
        })
        .catch((err) => console.error('Görev red bildirimi gönderilirken hata oluştu:', err));
    }

    return updated;
  }

  async delegateTask(taskId: string, actorId: string, toUserId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Görev bulunamadı.');
    if (task.assignedToId !== actorId) {
      throw new ForbiddenException('Bu görevi sadece atanan kişi başkasına devredebilir.');
    }

    const target = await this.prisma.user.findUnique({ where: { id: toUserId } });
    if (!target) throw new NotFoundException('Devredilecek kullanıcı bulunamadı.');

    if (target.role !== SystemRole.ADMIN) {
      const hasAccess = await this.prisma.projectPermission.findUnique({
        where: { userId_projectId: { userId: toUserId, projectId: task.projectId } },
      });
      if (!hasAccess) {
        throw new ForbiddenException('Devredilecek kullanıcının bu projeye erişimi yok.');
      }
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        assignedToId: toUserId,
        assignedById: actorId,
        status: TaskStatus.IN_PROGRESS,
      },
      include: TASK_INCLUDE,
    });

    this.notifyAssignment(updated, updated.assignedBy?.fullName).catch((err) =>
      console.error('Görev devir bildirimi gönderilirken hata oluştu:', err),
    );

    return updated;
  }

  private async notifyAssignment(task: any, assignerName?: string) {
    if (!task.assignedToId) return;
    await this.notificationsService.create(task.assignedToId, {
      actorId: task.assignedById,
      type: NotificationType.TASK_ASSIGNED,
      title: assignerName ? `${assignerName} size bir görev atadı` : 'Size bir görev atandı',
      body: task.title,
      entityType: 'project',
      entityId: task.projectId,
    });
  }

  private async notifyAdmins(task: any, suffix: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: SystemRole.ADMIN },
      select: { id: true },
    });
    await Promise.all(
      admins
        .filter((a) => a.id !== task.assignedToId)
        .map((a) =>
          this.notificationsService.create(a.id, {
            actorId: task.assignedToId,
            type: NotificationType.TASK_APPROVAL_NEEDED,
            title: `Bir görev ${suffix}`,
            body: task.title,
            entityType: 'project',
            entityId: task.projectId,
          }),
        ),
    );
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
        include: TASK_INCLUDE,
      });
      createdTasks.push(task);
    }

    return createdTasks;
  }
}
