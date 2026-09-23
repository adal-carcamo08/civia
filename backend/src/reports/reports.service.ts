import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReportDto) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: dto.organizationId,
        },
      },
      select: {
        status: true,
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Debes ser miembro activo de la organización para crear reportes.',
      );
    }

    const category = await this.prisma.category.findFirst({
      where: {
        id: dto.categoryId,
        organizationId: dto.organizationId,
        active: true,
      },
      select: {
        id: true,
        departmentId: true,
      },
    });

    if (!category) {
      throw new NotFoundException(
        'La categoría no existe o no pertenece a la organización.',
      );
    }

    const description = dto.description.trim();
    const location = dto.location.trim();

    if (description.length < 10 || location.length < 3) {
      throw new BadRequestException(
        'La descripción o ubicación no contienen información suficiente.',
      );
    }

    const code = `CIVIA-${randomUUID().toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: {
          code,
          reporterId: userId,
          organizationId: dto.organizationId,
          categoryId: category.id,
          departmentId: category.departmentId,
          description,
          location,
          latitude: dto.latitude,
          longitude: dto.longitude,
          status: 'RECEIVED',
        },
        select: {
          id: true,
          code: true,
          status: true,
          description: true,
          location: true,
          latitude: true,
          longitude: true,
          createdAt: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      await tx.reportStatusHistory.create({
        data: {
          reportId: report.id,
          fromStatus: null,
          toStatus: 'RECEIVED',
          changedByUserId: userId,
          note: 'Reporte creado.',
        },
      });

      return report;
    });
  }
}