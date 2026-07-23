import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { SystemRole } from 'src/common/enums';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  async updateUserStatus(id: string, status: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status },
    });
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
