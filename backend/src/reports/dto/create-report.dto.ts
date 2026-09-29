import { Type } from 'class-transformer';
import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateReportAiAnalysisDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  intent!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  domain!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  problemType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  problemLabel!: string;

  @IsUUID()
  suggestedCategoryId!: string;

  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  priority!: 'LOW' | 'MEDIUM' | 'HIGH';

  @IsNumber()
  @Min(0)
  @Max(1)
  detectionConfidence!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  categoryMatchConfidence!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  model!: string;

  @IsIn([
    'online_text',
    'online_text_image',
  ])
  classificationMode!:
    | 'online_text'
    | 'online_text_image';
}

export class CreateReportDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  categoryId!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(250)
  location!: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateReportAiAnalysisDto)
  aiAnalysis?: CreateReportAiAnalysisDto;
}
