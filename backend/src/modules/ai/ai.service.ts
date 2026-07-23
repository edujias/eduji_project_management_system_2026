import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class AiService {
  private geminiApiKey: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
  }

  // CANLI GOOGLE GEMINI AI API ÇAĞRISI
  async generateChatReply(channelId: string, userMessage: string, senderName: string): Promise<string> {
    if (!this.geminiApiKey) {
      return `⚠️ **Sistem Uyarısı**: Gerçek Google Gemini AI Asistanı ile iletişim kurulamadı. \`backend/.env\` dosyasında \`GEMINI_API_KEY\` tanımlanmamış. Lütfen geçerli bir Gemini API anahtarı ekleyin.`;
    }

    const recentMessages = await this.prisma.message.findMany({
      where: { channelId },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: { fullName: true } } },
    });

    const historyText = recentMessages
      .reverse()
      .map((m) => `${m.sender.fullName}: ${m.content}`)
      .join('\n');

    const promptText = `
Sen "🤖 Gemini AI Asistanı" adında bir yapay zeka çalışanısın.
Şirket içi Slack benzeri bir platformda çalışıyorsun. Projelerde aktif görev alıyor, ekip üyelerine destek oluyor, kod yazıyor, tavsiyelerde bulunuyor ve soruları içtenlikle yanıtlıyorsun.

KANALDAKİ SON MESAJLAR:
${historyText}

SANA YAZILAN YENİ MESAJ:
${senderName}: "${userMessage}"

Lütfen tamamen CANLI ve ÖZGÜN bir yanıt ver. Kullanıcıya yardımcı ol, samimi, profesyonel ve teknik olarak güçlü bir Türkçe yanıt ver. Yanıtında Markdown biçimlendirmeleri (kalın metin, kod blokları, maddeler) kullanabilirsin.
`;

    // Google Gemini v1beta geçerli model isimleri
    const models = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-flash-latest',
      'gemini-pro-latest',
      'gemini-1.5-flash',
    ];

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
            }),
          },
        );

        const data = await response.json();

        if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          console.log(`✅ [Google Gemini API Success] Model: ${model}`);
          return data.candidates[0].content.parts[0].text;
        } else if (data?.error) {
          console.warn(`[Google Gemini API] ${model} Hata (${data.error.code}): ${data.error.message}`);
        }
      } catch (err: any) {
        console.error(`[Google Gemini Bağlantı Hatası] ${model}:`, err);
      }
    }

    return `⚠️ **Sistem Uyarısı**: Google Gemini AI API çağrısı başarısız oldu. Lütfen \`backend/.env\` dosyasındaki API anahtarınızın geçerliliğini ve internet bağlantınızı kontrol edin.`;
  }

  async generateProjectRoadmap(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        channels: {
          include: {
            messages: {
              take: 10,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        permissions: {
          include: { user: { select: { fullName: true, role: true } } },
        },
      },
    });

    if (!project) throw new NotFoundException('Proje bulunamadı.');

    const messagesText = project.channels
      .flatMap((c) => c.messages)
      .map((m) => m.content)
      .join(' | ');

    const promptText = `
Sen bir Kıdemli Proje Yöneticisi ve Yapay Zeka Danışmanısın.
Aşağıdaki proje bilgilerini incele ve bu proje için adım adım profesyonel bir "Proje Yol Haritası (Roadmap)" ve "Aksiyon Planı" çıkar.

PROJE BİLGİLERİ:
- Proje Adı: ${project.name}
- Proje Kodu: ${project.code}
- Açıklama: ${project.description || 'Henüz açıklama girilmedi.'}
- Ekip Üyeleri: ${project.permissions.map((p) => p.user.fullName).join(', ') || 'Henüz yetkili atanmadı'}
- Son Konuşmalar/Mesajlar: ${messagesText || 'Henüz mesaj geçmişi yok'}

Lütfen yanıtı Türkçe ve Markdown formatında ver.
`;

    if (!this.geminiApiKey) {
      return {
        source: 'Sistem Uyarısı',
        roadmap: `⚠️ **Sistem Uyarısı**: Canlı yapay zeka analizi yapılamadı. Lütfen \`backend/.env\` dosyasına geçerli bir \`GEMINI_API_KEY\` ekleyin.`,
      };
    }

    const models = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-flash-latest',
      'gemini-pro-latest',
      'gemini-1.5-flash',
    ];
    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
            }),
          },
        );

        const data = await response.json();
        if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return { roadmap: data.candidates[0].content.parts[0].text, source: `Google ${model} Canlı API` };
        }
      } catch (err) {
        console.error(`[Gemini AI Roadmap] ${model} Hata:`, err);
      }
    }

    return {
      source: 'Sistem Uyarısı',
      roadmap: `⚠️ **Sistem Uyarısı**: Google Gemini AI API çağrısı başarısız oldu. Lütfen \`backend/.env\` dosyasındaki API anahtarınızın geçerliliğini kontrol edin.`,
    };
  }
}
