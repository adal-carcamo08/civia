import {
  IsEmail,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAdminInvitationDto {
  @IsString()
  @IsEmail()
  @MaxLength(254)
  email: string;
}