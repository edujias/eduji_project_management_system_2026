import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { ChannelType } from 'src/common/enums';

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  async createChannel(dto: { name: string; description?: string; type?: string; projectId: string }, creatorId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project) throw new NotFoundException('Proje bulunamadı.');

    return this.prisma.channel.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type || ChannelType.PROJECT_PUBLIC,
        projectId: dto.projectId,
        createdById: creatorId,
      },
    });
  }

  async getOrCreateDmChannel(dto: { targetUserId: string }, currentUserId: string) {
    if (dto.targetUserId === currentUserId) {
      throw new BadRequestException('Kendinizle birebir mesajlaşma başlatamazsınız.');
    }
    const existingDm = await this.prisma.channel.findFirst({
      where: {
        type: ChannelType.DIRECT_MESSAGE,
        members: {
          every: {
            userId: { in: [currentUserId, dto.targetUserId] },
          },
        },
      },
      include: {
        members: { include: { user: true } },
      },
    });

    if (existingDm) return existingDm;

    return this.prisma.channel.create({
      data: {
        name: 'DM',
        type: ChannelType.DIRECT_MESSAGE,
        createdById: currentUserId,
        members: {
          create: [{ userId: currentUserId }, { userId: dto.targetUserId }],
        },
      },
      include: {
        members: { include: { user: true } },
      },
    });
  }

  async getChannelById(channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        project: true,
        members: { include: { user: true } },
      },
    });
    if (!channel) throw new NotFoundException('Kanal bulunamadı.');
    return channel;
  }
}
