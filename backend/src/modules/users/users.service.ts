import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { SystemRole } from 'src/common/enums';
import { ChatGateway } from '../messages/chat.gateway';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}

  async onModuleInit() {
    await this.prisma.user.updateMany({
      where: { isOnline: true },
      data: { isOnline: false },
    });
    console.log('[UsersService] Reset all users online status to false on startup.');
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        status: true,
        isOnline: true,
        createdAt: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
        permissions: {
          include: { project: true },
        },
      },
    });

    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    return user;
  }

  async updateUserRole(id: string, role: SystemRole) {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
        isOnline: true,
        lastLoginAt: true,
        lastLogoutAt: true,
        totalPresenceTime: true,
      },
    });

    this.chatGateway.server.emit('userStatusChanged', updatedUser);
    return updatedUser;
  }

  async updateUserStatus(id: string, status: string) {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
        isOnline: true,
        lastLoginAt: true,
        lastLogoutAt: true,
        totalPresenceTime: true,
      },
    });

    this.chatGateway.server.emit('userStatusChanged', updatedUser);
    return updatedUser;
  }

  async getActivityReport() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        status: true,
        isOnline: true,
        lastLoginAt: true,
        lastLogoutAt: true,
        totalPresenceTime: true,
        createdAt: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }
}
