import { IsNotEmpty, IsOptional, IsEnum, IsString } from 'class-validator';
import { ProjectPermissionLevel } from '../../../common/enums';

export class CreateProjectDto {
  @IsNotEmpty({ message: 'Proje adı boş olamaz.' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Proje kodu boş olamaz (Örn: PRJ-001).' })
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AssignPermissionDto {
  @IsNotEmpty({ message: 'Kullanıcı ID boş olamaz.' })
  @IsString()
  userId: string;

  @IsNotEmpty({ message: 'İzin seviyesi belirtilmelidir.' })
  @IsEnum(ProjectPermissionLevel, { message: 'İzin READ veya WRITE olmalıdır.' })
  permission: ProjectPermissionLevel;
}
