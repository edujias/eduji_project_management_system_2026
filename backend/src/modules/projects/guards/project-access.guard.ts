import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectPermissionLevel, SystemRole } from '../../../common/enums';
import { PrismaService } from '../../../database/prisma.service';
import { PROJECT_PERMISSION_KEY } from '../../../common/decorators/require-project-permission.decorator';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<ProjectPermissionLevel>(
      PROJECT_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Kullanıcı oturum açmamış.');
    }

    if (user.role === SystemRole.ADMIN) {
      return true;
    }

    const projectId = await this.extractProjectId(request);

    if (!projectId) {
      throw new BadRequestException('İşlem yapılan istekte geçerli bir projectId bulunamadı.');
    }

    const userPermission = await this.prisma.projectPermission.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: projectId,
        },
      },
    });

    if (!userPermission) {
      throw new ForbiddenException('Bu projeye erişim yetkiniz bulunmamaktadır.');
    }

    if (requiredPermission === ProjectPermissionLevel.READ) {
      const hasReadAccess =
        userPermission.permission === ProjectPermissionLevel.READ ||
        userPermission.permission === ProjectPermissionLevel.WRITE;

      if (!hasReadAccess) {
        throw new ForbiddenException('Bu projeyi okuma / görüntüleme yetkiniz yok.');
      }
      return true;
    }

    if (requiredPermission === ProjectPermissionLevel.WRITE) {
      if (userPermission.permission !== ProjectPermissionLevel.WRITE) {
        throw new ForbiddenException('Bu projede değişiklik yapma / yazma yetkiniz yok.');
      }
      return true;
    }

    return false;
  }

  private async extractProjectId(request: any): Promise<string | null> {
    if (request.params?.projectId) return request.params.projectId;
    if (request.params?.id) return request.params.id;
    if (request.body?.projectId) return request.body.projectId;
    if (request.query?.projectId) return request.query.projectId;

    const channelId = request.params?.channelId || request.body?.channelId;
    if (channelId) {
      const channel = await this.prisma.channel.findUnique({
        where: { id: channelId },
        select: { projectId: true },
      });
      return channel?.projectId || null;
    }

    return null;
  }
}
