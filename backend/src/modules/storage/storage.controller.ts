import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import * as fs from 'fs';
import * as path from 'path';

@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Post('upload-url')
  @UseGuards(JwtAuthGuard)
  async getUploadUrl(@Body() body: any, @Request() req: any) {
    return this.storageService.generateUploadUrl(body, req.user.id);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async registerFile(@Body() body: any, @Request() req: any) {
    return this.storageService.registerFileAsset(body, req.user.id);
  }

  @Get('project/:projectId')
  @UseGuards(JwtAuthGuard)
  async getProjectFiles(@Param('projectId') projectId: string) {
    return this.storageService.getProjectFiles(projectId);
  }

  @Put('mock-upload')
  async mockUpload(
    @Query('s3Key') s3Key: string,
    @Request() req: any,
    @Res() res: any,
  ) {
    if (!s3Key) {
      throw new NotFoundException('s3Key is required');
    }
    const filePath = path.join(process.cwd(), 'uploads', s3Key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const fileStream = fs.createWriteStream(filePath);
    req.pipe(fileStream);

    await new Promise((resolve, reject) => {
      fileStream.on('finish', () => resolve(null));
      fileStream.on('error', reject);
      req.on('error', reject);
    });

    return res.status(200).json({ message: 'Success' });
  }

  @Get('file/*')
  async getFile(@Param('0') s3Key: string, @Res() res: any) {
    if (!s3Key) {
      throw new NotFoundException('s3Key is required');
    }
    const filePath = path.join(process.cwd(), 'uploads', s3Key);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Dosya bulunamadı.');
    }
    return res.sendFile(filePath);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteFile(@Param('id') id: string) {
    return this.storageService.deleteFileAsset(id);
  }
}
