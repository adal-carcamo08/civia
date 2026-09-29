import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ReportSuggestionImageDto {
  @IsString()
  @IsIn([
    'image/jpeg',
    'image/png',
    'image/webp',
  ])
  mime_type: string;

  @IsString()
  @MinLength(20)
  @MaxLength(8_000_000)
  data_base64: string;
}

export class ReportSuggestionDto {
  @IsUUID()
  organizationId: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => ReportSuggestionImageDto)
  images?: ReportSuggestionImageDto[];
}
