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

  async findMine(userId: string) {
    return this.prisma.report.findMany({
      where: {
        reporterId: userId,
      },
      select: {
        id: true,
        code: true,
        status: true,
        description: true,
        location: true,
        latitude: true,
        longitude: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
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
        attachments: {
          select: {
            id: true,
            url: true,
            fileName: true,
            mimeType: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  async findOneMine(reportId: string, userId: string) {
    const report = await this.prisma.report.findFirst({
      where: {
        id: reportId,
        reporterId: userId,
      },
      select: {
        id: true,
        code: true,
        status: true,
        description: true,
        location: true,
        latitude: true,
        longitude: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
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
        assignedTo: {
          select: {
            id: true,
            fullName: true,
          },
        },
        attachments: {
          select: {
            id: true,
            url: true,
            fileName: true,
            mimeType: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        history: {
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
            changedBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    return report;
  }}