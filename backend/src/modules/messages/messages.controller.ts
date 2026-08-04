import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser('id') senderId: string,
  ) {
    return this.messagesService.sendMessage(dto, senderId);
  }

  @Get('channel/:channelId')
  async getChannelMessages(
    @Param('channelId') channelId: string,
    @Query('limit') limit?: number,
  ) {
    return this.messagesService.getChannelMessages(channelId, limit ? Number(limit) : 50);
  }

  @Delete('channel/:channelId')
  async clearChannelMessages(@Param('channelId') channelId: string) {
    return this.messagesService.clearChannelMessages(channelId);
  }
}
