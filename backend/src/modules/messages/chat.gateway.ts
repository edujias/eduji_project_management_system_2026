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
import { PrismaService } from '../../database/prisma.service';

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
      client.data.connectedAt = Date.now();
      this.activeUsers.set(client.id, user.id);

      console.log(`[Socket] Kullanıcı bağlandı: ${user.fullName} (${client.id})`);

      // İlk bağlantı ise (yani başka bir sekmeden bağlı değilse) online yap
      const connectionCount = Array.from(this.activeUsers.values()).filter(
        (uid) => uid === user.id,
      ).length;

      if (connectionCount === 1) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            isOnline: true,
            lastLoginAt: new Date(),
          },
        });
        console.log(`[Socket] DB: ${user.fullName} aktif/online yapıldı.`);
      }
    } catch (err) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data?.user;
    const connectedAt = client.data?.connectedAt;

    this.activeUsers.delete(client.id);
    console.log(`[Socket] Bağlantı koptu: ${client.id}`);

    if (user) {
      try {
        const hasOtherConnections = Array.from(this.activeUsers.values()).some(
          (uid) => uid === user.id,
        );

        const updateData: any = {};

        if (!hasOtherConnections) {
          updateData.isOnline = false;
          updateData.lastLogoutAt = new Date();
        }

        if (connectedAt) {
          const durationSeconds = Math.round((Date.now() - connectedAt) / 1000);
          if (durationSeconds > 0) {
            updateData.totalPresenceTime = {
              increment: durationSeconds,
            };
            console.log(`[Socket] Kullanıcı ${user.fullName} bu oturumda ${durationSeconds} saniye geçirdi.`);
          }
        }

        if (Object.keys(updateData).length > 0) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
          if (!hasOtherConnections) {
            console.log(`[Socket] DB: ${user.fullName} çevrimdışı yapıldı.`);
          }
        }
      } catch (err) {
        console.error('[Socket] Bağlantı sonlanırken aktivite kaydedilemedi:', err);
      }
    }
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
