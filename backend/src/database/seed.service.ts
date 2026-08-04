import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as bcrypt from 'bcryptjs';
import { SystemRole, ProjectPermissionLevel } from '../common/enums';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedInitialData();
  }

  async seedInitialData() {
    // 1. Gemini AI Bot Kullanıcısını Kontrol Et & Yoksa Oluştur
    let aiUser = await this.prisma.user.findUnique({
      where: { email: 'gemini@company.com' },
    });

    const defaultPassword = await bcrypt.hash('admin123', 10);

    if (!aiUser) {
      aiUser = await this.prisma.user.create({
        data: {
          email: 'gemini@company.com',
          fullName: '🤖 Gemini AI Asistanı',
          passwordHash: defaultPassword,
          role: SystemRole.EMPLOYEE,
          status: 'ACTIVE',
        },
      });
      console.log('🤖 Gemini AI Bot kullanıcısı oluşturuldu (gemini@company.com)');
    }

    const userCount = await this.prisma.user.count();
    if (userCount > 1) {
      console.log('🌱 Veritabanında mevcut veriler var, ilave seed atlandı.');
      return;
    }

    console.log('🌱 Demolar için otomatik Seed verileri yükleniyor...');

    // Admin Kullanıcı
    const admin = await this.prisma.user.create({
      data: {
        email: 'admin@company.com',
        fullName: 'Ahmet Yılmaz (Yönetici)',
        passwordHash: defaultPassword,
        role: SystemRole.ADMIN,
      },
    });

    // Demo Çalışanlar
    const emp1 = await this.prisma.user.create({
      data: {
        email: 'zeynep@company.com',
        fullName: 'Zeynep Kaya (Yazılım Geliştirici)',
        passwordHash: defaultPassword,
        role: SystemRole.EMPLOYEE,
      },
    });

    const emp2 = await this.prisma.user.create({
      data: {
        email: 'mehmet@company.com',
        fullName: 'Mehmet Demir (UI/UX Tasarımcı)',
        passwordHash: defaultPassword,
        role: SystemRole.EMPLOYEE,
      },
    });

    // Varsayılan Şirket Projesi
    const project = await this.prisma.project.create({
      data: {
        name: 'Dahili Dijital Dönüşüm Projesi',
        code: 'PRJ-DIGITAL',
        description:
          'Şirket içi süreçlerin dijitalleştirilmesi, mobil uygulama ve anlık mesajlaşma altyapısının kurulması projesi.',
        channels: {
          create: [
            {
              name: 'genel',
              description: 'Genel sohbet ve duyuru kanalı',
              type: 'PROJECT_PUBLIC',
              createdById: admin.id,
            },
            {
              name: 'yazilim-ekibi',
              description: 'Frontend ve Backend geliştirme sohbetleri',
              type: 'PROJECT_PUBLIC',
              createdById: admin.id,
            },
          ],
        },
      },
      include: { channels: true },
    });

    // Projeye Çalışan ve Gemini AI Atamaları
    await this.prisma.projectPermission.createMany({
      data: [
        {
          userId: aiUser.id,
          projectId: project.id,
          permission: ProjectPermissionLevel.WRITE,
        },
        {
          userId: emp1.id,
          projectId: project.id,
          permission: ProjectPermissionLevel.WRITE,
        },
        {
          userId: emp2.id,
          projectId: project.id,
          permission: ProjectPermissionLevel.READ,
        },
      ],
    });

    // İlk Karşılama Mesajı
    const defaultChannel = project.channels[0];
    if (defaultChannel) {
      await this.prisma.message.create({
        data: {
          channelId: defaultChannel.id,
          senderId: aiUser.id,
          content:
            '🤖 Merhaba! Ben şirket içi **Gemini AI Asistanınızım**. Beni dilediğiniz projeye çalışan olarak atayabilir, bu kanalda veya diğer kanallarda bana sorular sorabilirsiniz!',
        },
      });
    }

    console.log('✅ Demo kullanıcılar ve Gemini AI projelere atandı!');
  }
}
