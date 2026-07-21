import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class StorageService {
  private bucketName: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.bucketName =
      this.configService.get<string>('S3_BUCKET_NAME') || 'enterprise-files';
  }

  async generateUploadUrl(dto: { fileName: string; projectId: string }, userId: string) {
    const s3Key = `projects/${dto.projectId}/${Date.now()}_${dto.fileName}`;
    const uploadUrl = `https://storage.enterprise.local/${this.bucketName}/${s3Key}?mock_presigned=true`;

    return {
      uploadUrl,
      s3Key,
      expiresIn: 3600,
    };
  }

  async registerFileAsset(data: { projectId: string; fileName: string; fileSize: number; mimeType: string; s3Key: string; messageId?: string }, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
    });
    if (!project) throw new NotFoundException('Proje bulunamadı.');

    return this.prisma.fileAsset.create({
      data: {
        projectId: data.projectId,
        uploadedById: userId,
        messageId: data.messageId || null,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        s3Key: data.s3Key,
        publicUrl: `https://storage.enterprise.local/${this.bucketName}/${data.s3Key}`,
      },
    });
  }

  async getProjectFiles(projectId: string) {
    return this.prisma.fileAsset.findMany({
      where: { projectId },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
