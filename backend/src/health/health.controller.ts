import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('database')
  async database() {
    const users = await this.prisma.user.count();

    return {
      status: 'ok',
      database: 'connected',
      users,
    };
  }
}