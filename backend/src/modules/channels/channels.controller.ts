import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Post()
  async createChannel(@Body() dto: any, @Request() req: any) {
    return this.channelsService.createChannel(dto, req.user.id);
  }

  @Post('dm')
  async createDm(@Body() dto: { targetUserId: string }, @Request() req: any) {
    return this.channelsService.getOrCreateDmChannel(dto, req.user.id);
  }

  @Get(':channelId')
  async getChannel(@Param('channelId') channelId: string) {
    return this.channelsService.getChannelById(channelId);
  }
}
