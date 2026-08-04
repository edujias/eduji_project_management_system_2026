import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

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

  async analyzeFileAsset(fileId: string) {
    const file = await this.prisma.fileAsset.findUnique({
      where: { id: fileId },
    });
    if (!file) throw new NotFoundException('Dosya bulunamadı.');

    const filePath = path.join(process.cwd(), 'uploads', file.s3Key);
    let contentSnippet = '';

    if (fs.existsSync(filePath)) {
      try {
        const ext = path.extname(file.fileName).toLowerCase();
        const readableExtensions = ['.txt', '.json', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.md', '.log', '.csv', '.xml', '.yml', '.yaml'];
        if (readableExtensions.includes(ext)) {
          const fullContent = fs.readFileSync(filePath, 'utf-8');
          contentSnippet = fullContent.substring(0, 8000);
        } else {
          contentSnippet = `[Bu dosya ikili (binary) bir formatta veya önizlenemez bir boyutta: ${file.mimeType || 'Bilinmeyen'} formatı. Dosya adını ve meta verilerini özetleyin.]`;
        }
      } catch (err) {
        console.error('Dosya okuma hatası:', err);
        contentSnippet = `[Dosya içeriği okunurken bir hata oluştu: ${err.message}]`;
      }
    } else {
      contentSnippet = '[Dosya fiziksel diskte bulunamadı veya henüz yüklenmedi.]';
    }

    const promptText = `
Sen bir Proje Yönetim Sistemi Yapay Zeka Denetçisisin.
Aşağıdaki dosya detaylarını ve içeriğini incele:

DOSYA DETAYLARI:
- Dosya Adı: ${file.fileName}
- Boyut: ${(file.fileSize / 1024).toFixed(1)} KB
- Format: ${file.mimeType || 'Bilinmeyen'}
- Eklenme Tarihi: ${file.createdAt}

DOSYA İÇERİĞİ:
"""
${contentSnippet}
"""

Lütfen bu dosyayı inceleyip Türkçe bir analiz ve özet raporu hazırla. 
Rapor şunları içermelidir:
1. **Dosya Tanımı**: Dosyanın ne işe yaradığı ve genel yapısı.
2. **Ana Bulgular / Özet**: Dosya içindeki en kritik bilgiler veya kod bloklarının analizi.
3. **AI Tavsiyeleri**: Dosya kalitesini, verimliliğini, güvenliğini artırmaya yönelik tavsiyelerin.

Yanıtını tamamen Türkçe ve Markdown formatında ver.
`;

    if (!this.geminiApiKey) {
      return {
        summary: `🤖 **Gemini AI Doküman Analiz Raporu (Çevrimdışı Simülasyon)**

📄 **Dosya Adı:** ${file.fileName}
📊 **Boyut:** ${(file.fileSize / 1024).toFixed(1)} KB

### ⚠️ API Anahtarı Tanımlanmamış:
\`backend/.env\` dosyasında \`GEMINI_API_KEY\` tanımlanmadığı için canlı Gemini analizi yapılamadı.

### 📌 Çevrimdışı Analiz (Simülasyon):
1. **Dosya Tanımı**: Bu dosya, projede yer alan **${file.fileName}** isimli bir dokümandır.
2. **Ana Bulgular**: Boyutu **${(file.fileSize / 1024).toFixed(1)} KB** olup, formatı **${file.mimeType || 'Bilinmeyen'}** olarak kayıtlıdır.
3. **AI Tavsiyesi**: Canlı ve içerik odaklı analiz gerçekleştirebilmek için lütfen \`GEMINI_API_KEY\` tanımlayıp Docker veritabanını çalıştırın.`
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
          return { summary: data.candidates[0].content.parts[0].text };
        }
      } catch (err) {
        console.error(`[Gemini AI File Analysis] ${model} Hata:`, err);
      }
    }

    return {
      summary: `⚠️ **Sistem Uyarısı**: Google Gemini AI API çağrısı başarısız oldu. Lütfen \`backend/.env\` dosyasındaki API anahtarınızın geçerliliğini kontrol edin.`,
    };
  }
}
