import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/database/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private activeUsers = new Map<string, string>(); // socketId -> userId

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret:
          this.configService.get<string>('JWT_SECRET') ||
          'super-secret-jwt-key-change-in-production-2026',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, fullName: true, role: true },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      client.data.user = user;
      this.activeUsers.set(client.id, user.id);

      console.log(`[Socket] Kullanıcı bağlandı: ${user.fullName} (${client.id})`);
    } catch (err) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.activeUsers.delete(client.id);
    console.log(`[Socket] Bağlantı koptu: ${client.id}`);
  }

  @SubscribeMessage('joinChannel')
  handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    if (data?.channelId) {
      client.join(data.channelId);
      console.log(`[Socket] Client ${client.id} kanala katıldı: ${data.channelId}`);
      return { status: 'joined', channelId: data.channelId };
    }
  }

  @SubscribeMessage('leaveChannel')
  handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    if (data?.channelId) {
      client.leave(data.channelId);
      return { status: 'left', channelId: data.channelId };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; isTyping: boolean },
  ) {
    const user = client.data.user;
    if (user && data?.channelId) {
      client.to(data.channelId).emit('userTyping', {
        channelId: data.channelId,
        user: { id: user.id, fullName: user.fullName },
        isTyping: data.isTyping,
      });
    }
  }

  // Mesaj oluştuğunda o kanala bağlı olan herkese canlı yayın yapar
  broadcastMessageToChannel(channelId: string, message: any) {
    this.server.to(channelId).emit('newMessage', message);
  }
}
