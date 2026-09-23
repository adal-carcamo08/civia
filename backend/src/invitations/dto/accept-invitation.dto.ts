import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  token: string;
}