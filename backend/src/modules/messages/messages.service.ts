import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { SendMessageDto } from './dto/message.dto';
import { ChatGateway } from './chat.gateway';
import { AiService } from '../ai/ai.service';
import { ProjectPermissionLevel, SystemRole } from 'src/common/enums';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
    private aiService: AiService,
  ) {}

  async sendMessage(dto: SendMessageDto, senderId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: dto.channelId },
      select: { id: true, projectId: true, type: true },
    });

    if (!channel) throw new NotFoundException('Kanal bulunamadı.');

    if (channel.projectId) {
      const user = await this.prisma.user.findUnique({ where: { id: senderId } });
      if (user?.role !== SystemRole.ADMIN) {
        const perm = await this.prisma.projectPermission.findUnique({
          where: {
            userId_projectId: { userId: senderId, projectId: channel.projectId },
          },
        });
        if (!perm || perm.permission !== ProjectPermissionLevel.WRITE) {
          throw new ForbiddenException('Bu kanala mesaj yazma yetkiniz (WRITE) bulunmuyor.');
        }
      }
    }

    const message = await this.prisma.message.create({
      data: {
        channelId: dto.channelId,
        senderId: senderId,
        content: dto.content,
        parentId: dto.parentId || null,
        attachments: dto.attachmentIds
          ? { connect: dto.attachmentIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        sender: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        attachments: true,
      },
    });

    // Mesajı tüm oda üyelerine canlı yayınla
    this.chatGateway.broadcastMessageToChannel(dto.channelId, message);

    // GEMINI AI CANLI YANIT TETİKLEYİCİSİ
    this.handleGeminiAutoReply(channel, dto.content, message.sender);

    return message;
  }

  private async handleGeminiAutoReply(channel: any, content: string, sender: any) {
    // Eğer mesajı yazan zaten Gemini AI ise tekrar yanıt verme (sonsuz döngüyü engeller)
    if (sender.email === 'gemini@company.com') return;

    // Gemini AI Kullanıcısını Bul veya Yoksa Otomatik Oluştur
    let aiUser = await this.prisma.user.findUnique({
      where: { email: 'gemini@company.com' },
    });

    if (aiUser && aiUser.status !== 'ACTIVE') {
      console.log('🤖 [Gemini AI] Gemini pasif durumda olduğu için otomatik yanıt tetiklenmedi.');
      return;
    }

    if (!aiUser) {
      aiUser = await this.prisma.user.create({
        data: {
          email: 'gemini@company.com',
          fullName: '🤖 Gemini AI Asistanı',
          passwordHash: 'bot-no-password',
          role: SystemRole.EMPLOYEE,
          status: 'ACTIVE',
        },
      });
    }

    // Gemini AI'a projede otomatik izin ata (Eğer yoksa)
    if (channel.projectId) {
      await this.prisma.projectPermission.upsert({
        where: {
          userId_projectId: { userId: aiUser.id, projectId: channel.projectId },
        },
        update: {},
        create: {
          userId: aiUser.id,
          projectId: channel.projectId,
          permission: ProjectPermissionLevel.WRITE,
        },
      });
    }

    // Gemini AI Yanıtını Arka Planda Üret ve Odada Canlı Yayınla
    setTimeout(async () => {
      try {
        const aiReplyContent = await this.aiService.generateChatReply(
          channel.id,
          content,
          sender.fullName,
        );

        const aiMessage = await this.prisma.message.create({
          data: {
            channelId: channel.id,
            senderId: aiUser.id,
            content: aiReplyContent,
          },
          include: {
            sender: {
              select: { id: true, fullName: true, email: true, avatarUrl: true },
            },
            attachments: true,
          },
        });

        console.log(`🤖 [Gemini AI] Mesaj gönderildi -> Kanal: ${channel.id}`);
        this.chatGateway.broadcastMessageToChannel(channel.id, aiMessage);
      } catch (err) {
        console.error('Gemini AI Yanıt Üretme Hatası:', err);
      }
    }, 600);
  }

  async getChannelMessages(channelId: string, limit = 50) {
    return this.prisma.message.findMany({
      where: { channelId },
      include: {
        sender: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        attachments: true,
        replies: {
          include: {
            sender: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }
}
