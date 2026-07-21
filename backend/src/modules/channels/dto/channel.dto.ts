import { IsNotEmpty, IsOptional, IsEnum, IsString } from 'class-validator';
import { ChannelType } from 'src/common/enums';

export class CreateChannelDto {
  @IsNotEmpty({ message: 'Proje ID belirtilmelidir.' })
  @IsString()
  projectId: string;

  @IsNotEmpty({ message: 'Kanal adı boş olamaz.' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ChannelType)
  type?: ChannelType;
}

export class CreateDirectMessageChannelDto {
  @IsNotEmpty({ message: 'Mesajlaşılacak kullanıcı ID boş olamaz.' })
  @IsString()
  targetUserId: string;
}
