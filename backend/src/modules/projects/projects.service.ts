import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ChatGateway } from '../realtime/chat.gateway';
import { SystemRole, ProjectPermissionLevel } from '../../common/enums';

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}

  async createProject(dto: { name: string; code: string; description?: string }, creatorId: string) {
    const existing = await this.prisma.project.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException('Bu kod ile zaten bir proje mevcut.');
    }

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        channels: {
          create: [
            {
              name: 'genel',
              description: 'Genel proje kanalı',
              type: 'PROJECT_PUBLIC',
              createdById: creatorId,
            },
          ],
        },
      },
      include: {
        channels: true,
      },
    });

    // Projeyi oluşturan kişiye ve Gemini AI'a otomatik WRITE izni ver
    await this.prisma.projectPermission.create({
      data: {
        userId: creatorId,
        projectId: project.id,
        permission: ProjectPermissionLevel.WRITE,
      },
    });

    return project;
  }

  async getUserProjects(userId: string, role: string) {
    if (role === SystemRole.ADMIN) {
      return this.prisma.project.findMany({
        include: {
          channels: true,
          permissions: {
            include: {
              user: { select: { id: true, fullName: true, email: true, role: true, isOnline: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.project.findMany({
      where: {
        permissions: {
          some: { userId },
        },
      },
      include: {
        channels: true,
        permissions: {
          include: {
            user: { select: { id: true, fullName: true, email: true, role: true, isOnline: true, status: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProjectById(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        channels: {
          include: {
            messages: {
              take: 20,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        permissions: {
          include: {
            user: { select: { id: true, fullName: true, email: true, role: true, isOnline: true, status: true } },
          },
        },
        fileAssets: true,
        tasks: {
          include: {
            assignedTo: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!project) throw new NotFoundException('Proje bulunamadı.');
    return project;
  }

  async assignPermission(projectId: string, dto: { userId: string; permission: string }) {
    return this.prisma.projectPermission.upsert({
      where: {
        userId_projectId: {
          userId: dto.userId,
          projectId: projectId,
        },
      },
      update: {
        permission: dto.permission,
      },
      create: {
        userId: dto.userId,
        projectId: projectId,
        permission: dto.permission,
      },
    });
  }

  async removePermission(projectId: string, userId: string) {
    const result = await this.prisma.projectPermission.delete({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    this.chatGateway.emitToUser(userId, 'projectAccessRevoked', { projectId });

    return result;
  }

  async updateProject(projectId: string, dto: { name: string; description?: string }) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Proje bulunamadı.');

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async deleteProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Proje bulunamadı.');

    return this.prisma.project.delete({
      where: { id: projectId },
    });
  }
}
