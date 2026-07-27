import { Inject, Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { SystemRole } from 'src/common/enums';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(JwtService) private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Bu e-posta adresiyle kayıtlı kullanıcı zaten var.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const userCount = await this.prisma.user.count();
    const role = userCount === 0 ? SystemRole.ADMIN : SystemRole.EMPLOYEE;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role,
      },
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Şu an pasif durumdasınız, giriş yapamazsınız.');
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      accessToken: token,
    };
  }

  private generateToken(userId: string, email: string, role: string) {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: code,
        resetTokenExpires: expires,
      },
    });

    await this.mailService.sendPasswordResetMail(user.email, code);

    return { message: 'Şifre sıfırlama kodu e-posta adresinize gönderildi.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    if (!user.resetToken || user.resetToken !== dto.code) {
      throw new BadRequestException('Geçersiz doğrulama kodu.');
    }

    if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      throw new BadRequestException('Doğrulama kodunun süresi dolmuş.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return { message: 'Şifreniz başarıyla güncellendi.' };
  }
}
