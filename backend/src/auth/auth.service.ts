import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger =
    new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    const email =
      process.env.GLOBAL_ADMIN_EMAIL
        ?.trim()
        .toLowerCase();

    const password =
      process.env.GLOBAL_ADMIN_PASSWORD;

    const fullName =
      process.env.GLOBAL_ADMIN_NAME
        ?.trim() ||
      'Super Administrador CIVIA';

    if (!email && !password) {
      return;
    }

    if (
      !email ||
      !password ||
      password.length < 8
    ) {
      this.logger.warn(
        'GLOBAL_ADMIN_EMAIL y GLOBAL_ADMIN_PASSWORD deben estar configurados correctamente para inicializar el administrador global.',
      );

      return;
    }

    const existingUser =
      await this.prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          role: true,
          active: true,
        },
      });

    if (existingUser) {
      if (
        existingUser.role !==
          'GLOBAL_ADMIN' ||
        !existingUser.active
      ) {
        await this.prisma.user.update({
          where: {
            id: existingUser.id,
          },
          data: {
            role: 'GLOBAL_ADMIN',
            active: true,
          },
        });
      }

      return;
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12,
      );

    await this.prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role: 'GLOBAL_ADMIN',
        active: true,
      },
    });

    this.logger.log(
      `Administrador global inicializado: ${email}`,
    );
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe una cuenta con este correo.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        passwordHash: true,
        role: true,
        active: true,
      },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    };
  }
}