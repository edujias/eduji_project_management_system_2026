import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateEvaluationDto {
  @IsString()
  userId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsString()
  @IsOptional()
  feedback?: string;

  @IsString()
  date: string; // format YYYY-MM-DD
}
