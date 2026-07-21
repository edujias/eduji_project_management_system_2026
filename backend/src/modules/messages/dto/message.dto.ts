import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty({ message: 'Kanal ID boş olamaz.' })
  @IsString()
  channelId: string;

  @IsNotEmpty({ message: 'Mesaj içeriği boş olamaz.' })
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString({ each: true })
  attachmentIds?: string[];
}
