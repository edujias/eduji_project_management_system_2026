import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ChatGateway } from '../realtime/chat.gateway';
import { NotificationType } from '../../common/enums';

interface CreateNotificationInput {
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}

  // Bir projenin bildirim alacak üyeleri: ProjectPermission sahipleri + tüm ADMIN kullanıcılar
  // (ADMIN'ler ProjectPermission kaydı olmasa da tüm projeleri görebiliyor, bkz. projects.service.ts)
  private async getProjectRecipientIds(projectId: string, excludeUserId: string) {
    const [permissions, admins] = await Promise.all([
      this.prisma.projectPermission.findMany({
        where: { projectId },
        select: { userId: true },
      }),
      this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      }),
    ]);

    const ids = new Set<string>([
      ...permissions.map((p) => p.userId),
      ...admins.map((a) => a.id),
    ]);
    ids.delete(excludeUserId);

    return Array.from(ids);
  }

  async create(userId: string, input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        actorId: input.actorId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        entityType: input.entityType,
        entityId: input.entityId,
      },
    });

    this.chatGateway.emitToUser(userId, 'notification', notification);

    return notification;
  }

  async notifyNewMessage(
    channel: { id: string; type: string; name?: string | null; projectId?: string | null },
    message: { id: string; content: string },
    senderId: string,
    senderName: string,
  ) {
    const preview =
      message.content.length > 120 ? `${message.content.slice(0, 120)}…` : message.content;

    if (channel.type === 'DIRECT_MESSAGE') {
      // DM kanallarında üyelik ChannelMember tablosunda tutulur
      const members = await this.prisma.channelMember.findMany({
        where: { channelId: channel.id },
        select: { userId: true },
      });
      const recipientIds = members
        .map((m) => m.userId)
        .filter((userId) => userId !== senderId);

      await Promise.all(
        recipientIds.map((userId) =>
          this.create(userId, {
            actorId: senderId,
            type: NotificationType.MESSAGE_DM,
            title: `${senderName} sana mesaj gönderdi`,
            body: preview,
            entityType: 'channel',
            entityId: channel.id,
          }),
        ),
      );
      return;
    }

    if (!channel.projectId) return;

    // Proje/grup kanallarında üyelik ChannelMember'da değil, ProjectPermission'da tutulur
    // (mesaj gönderme yetkisi de aynı şekilde kontrol ediliyor, bkz. messages.service.ts)
    const recipientIds = await this.getProjectRecipientIds(channel.projectId, senderId);

    await Promise.all(
      recipientIds.map((userId) =>
        this.create(userId, {
          actorId: senderId,
          type: NotificationType.MESSAGE_GROUP,
          title: `${senderName} #${channel.name ?? 'kanal'} kanalına mesaj gönderdi`,
          body: preview,
          entityType: 'channel',
          entityId: channel.id,
        }),
      ),
    );
  }

  async notifyTaskCreated(
    projectId: string,
    task: { id: string; title: string },
    creatorId: string,
    creatorName: string,
  ) {
    const recipientIds = await this.getProjectRecipientIds(projectId, creatorId);

    await Promise.all(
      recipientIds.map((userId) =>
        this.create(userId, {
          actorId: creatorId,
          type: NotificationType.TASK_CREATED,
          title: `${creatorName} yeni bir görev ekledi`,
          body: task.title,
          entityType: 'project',
          entityId: projectId,
        }),
      ),
    );
  }

  findForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
