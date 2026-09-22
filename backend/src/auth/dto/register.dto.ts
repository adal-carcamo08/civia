import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  fullName: string;

  @IsEmail()
  @MaxLength(150)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[A-Za-z]/, {
    message: 'La contraseña debe incluir al menos una letra.',
  })
  @Matches(/\d/, {
    message: 'La contraseña debe incluir al menos un número.',
  })
  password: string;
}