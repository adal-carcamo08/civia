import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateGlobalOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(['PUBLIC', 'PRIVATE'])
  type?: 'PUBLIC' | 'PRIVATE';

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}