import {
  IsEmail,
  IsString,
  MaxLength,
} from 'class-validator';

export class AssignGlobalOrganizationAdminDto {
  @IsString()
  @IsEmail()
  @MaxLength(254)
  email: string;
}