import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateGlobalOrganizationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsIn(['PUBLIC', 'PRIVATE'])
  type: 'PUBLIC' | 'PRIVATE';

  @IsString()
  @IsEmail()
  @MaxLength(254)
  initialAdminEmail: string;
}