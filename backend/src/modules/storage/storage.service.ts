import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

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
    const port = this.configService.get<number>('PORT') || 4001;
    const uploadUrl = `http://localhost:${port}/api/storage/mock-upload?s3Key=${s3Key}`;

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

    const port = this.configService.get<number>('PORT') || 4001;

    return this.prisma.fileAsset.create({
      data: {
        projectId: data.projectId,
        uploadedById: userId,
        messageId: data.messageId || null,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        s3Key: data.s3Key,
        publicUrl: `http://localhost:${port}/api/storage/file/${data.s3Key}`,
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

  async deleteFileAsset(fileId: string) {
    const fileAsset = await this.prisma.fileAsset.findUnique({
      where: { id: fileId },
    });
    if (!fileAsset) throw new NotFoundException('Dosya bulunamadı.');

    await this.prisma.fileAsset.delete({
      where: { id: fileId },
    });

    const filePath = path.join(process.cwd(), 'uploads', fileAsset.s3Key);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Dosya diskten silinirken hata:', err);
      }
    }

    return { success: true };
  }
}
