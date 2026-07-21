import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Post('upload-url')
  async getUploadUrl(@Body() body: any, @Request() req: any) {
    return this.storageService.generateUploadUrl(body, req.user.id);
  }

  @Post('register')
  async registerFile(@Body() body: any, @Request() req: any) {
    return this.storageService.registerFileAsset(body, req.user.id);
  }

  @Get('project/:projectId')
  async getProjectFiles(@Param('projectId') projectId: string) {
    return this.storageService.getProjectFiles(projectId);
  }
}
