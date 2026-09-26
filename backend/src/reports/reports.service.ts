import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  mkdir,
  readFile,
  unlink,
  writeFile,
} from 'fs/promises';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

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

  async update(
    reportId: string,
    userId: string,
    dto: UpdateReportDto,
  ) {
    if (
      dto.categoryId === undefined &&
      dto.description === undefined &&
      dto.location === undefined
    ) {
      throw new BadRequestException(
        'Debes indicar al menos un dato para actualizar.'
      );
    }

    const report = await this.prisma.report.findFirst({
      where: {
        id: reportId,
        reporterId: userId,
      },
      select: {
        id: true,
        status: true,
        organizationId: true,
      },
    });

    if (!report) {
      throw new NotFoundException(
        'Reporte no encontrado.'
      );
    }

    if (report.status !== 'RECEIVED') {
      throw new BadRequestException(
        'Solo puedes editar el reporte mientras esté recibido.'
      );
    }

    let categoryId: string | undefined;
    let departmentId: string | null | undefined;

    if (dto.categoryId !== undefined) {
      const category =
        await this.prisma.category.findFirst({
          where: {
            id: dto.categoryId,
            organizationId: report.organizationId,
            active: true,
          },
          select: {
            id: true,
            departmentId: true,
          },
        });

      if (!category) {
        throw new NotFoundException(
          'La categoría no existe o no pertenece a la organización.'
        );
      }

      categoryId = category.id;
      departmentId = category.departmentId;
    }

    const description =
      dto.description !== undefined
        ? dto.description.trim()
        : undefined;

    const location =
      dto.location !== undefined
        ? dto.location.trim()
        : undefined;

    if (
      description !== undefined &&
      description.length < 10
    ) {
      throw new BadRequestException(
        'La descripción no contiene información suficiente.'
      );
    }

    if (
      location !== undefined &&
      location.length < 3
    ) {
      throw new BadRequestException(
        'La ubicación no contiene información suficiente.'
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedReport = await tx.report.update({
        where: {
          id: report.id,
        },
        data: {
          ...(categoryId !== undefined
            ? {
                categoryId,
                departmentId,
              }
            : {}),
          ...(description !== undefined
            ? {
                description,
              }
            : {}),
          ...(location !== undefined
            ? {
                location,
              }
            : {}),
        },
        select: {
          id: true,
          code: true,
          status: true,
          description: true,
          location: true,
          updatedAt: true,
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
          fromStatus: 'RECEIVED',
          toStatus: 'RECEIVED',
          changedByUserId: userId,
          note: 'Reporte editado por el usuario.',
        },
      });

      return updatedReport;
    });
  }

  async cancel(reportId: string, userId: string) {
    const report = await this.prisma.report.findFirst({
      where: {
        id: reportId,
        reporterId: userId,
      },
      select: {
        id: true,
        code: true,
        status: true,
      },
    });

    if (!report) {
      throw new NotFoundException(
        'Reporte no encontrado.'
      );
    }

    if (
      report.status !== 'RECEIVED' &&
      report.status !== 'UNDER_REVIEW'
    ) {
      throw new BadRequestException(
        'El reporte ya no puede ser cancelado en su estado actual.'
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedReport = await tx.report.update({
        where: {
          id: report.id,
        },
        data: {
          status: 'CANCELLED',
        },
        select: {
          id: true,
          code: true,
          status: true,
          updatedAt: true,
        },
      });

      await tx.reportStatusHistory.create({
        data: {
          reportId: report.id,
          fromStatus: report.status,
          toStatus: 'CANCELLED',
          changedByUserId: userId,
          note: 'Reporte cancelado por el usuario.',
        },
      });

      return updatedReport;
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
  }
  async findByOrganization(
    organizationId: string,
    userId: string,
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        organizationId,
        status: 'ACTIVE',
        organization: {
          active: true,
        },
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Debes ser miembro activo de la organización para consultar sus reportes.',
      );
    }

    return this.prisma.report.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        code: true,
        status: true,
        description: true,
        location: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
        reporter: {
          select: {
            id: true,
            fullName: true,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  async addAttachment(
    reportId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    const report = await this.prisma.report.findFirst({
      where: {
        id: reportId,
        reporterId: userId,
      },
      select: {
        id: true,
        status: true,
        _count: {
          select: {
            attachments: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    if (report.status !== 'RECEIVED') {
      throw new BadRequestException(
        'Solo puedes agregar evidencias mientras el reporte esté recibido.'
      );
    }

    if (report._count.attachments >= 5) {
      throw new BadRequestException(
        'El reporte ya tiene el máximo de 5 fotografías.'
      );
    }

    const allowedMimeTypes: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };

    const extension = allowedMimeTypes[file.mimetype];

    if (!extension) {
      throw new BadRequestException(
        'Solo se permiten imágenes JPEG, PNG o WEBP.',
      );
    }

    const attachmentId = randomUUID();
    const directory = join(
      process.cwd(),
      'uploads',
      'reports',
      reportId,
    );

    await mkdir(directory, {
      recursive: true,
    });

    const storedFileName = `${attachmentId}${extension}`;
    const filePath = join(directory, storedFileName);

    await writeFile(filePath, file.buffer);

    try {
      return await this.prisma.reportAttachment.create({
        data: {
          id: attachmentId,
          reportId,
          url: `/reports/${reportId}/attachments/${attachmentId}/file`,
          fileName:
            file.originalname ||
            `evidencia${extname(storedFileName)}`,
          mimeType: file.mimetype,
        },
        select: {
          id: true,
          url: true,
          fileName: true,
          mimeType: true,
          createdAt: true,
        },
      });
    } catch (error) {
      await unlink(filePath).catch(() => undefined);
      throw error;
    }
  }
  async removeAttachment(
    reportId: string,
    attachmentId: string,
    userId: string,
  ) {
    const attachment =
      await this.prisma.reportAttachment.findFirst({
        where: {
          id: attachmentId,
          reportId,
          report: {
            reporterId: userId,
          },
        },
        select: {
          id: true,
          mimeType: true,
          report: {
            select: {
              status: true,
            },
          },
        },
      });

    if (!attachment) {
      throw new NotFoundException(
        'Evidencia no encontrada.'
      );
    }

    if (attachment.report.status !== 'RECEIVED') {
      throw new BadRequestException(
        'Solo puedes eliminar evidencias mientras el reporte esté recibido.'
      );
    }

    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };

    const extension = attachment.mimeType
      ? extensions[attachment.mimeType]
      : undefined;

    if (!extension) {
      throw new NotFoundException(
        'Evidencia no encontrada.'
      );
    }

    const filePath = join(
      process.cwd(),
      'uploads',
      'reports',
      reportId,
      `${attachment.id}${extension}`,
    );

    try {
      await unlink(filePath);
    } catch (error) {
      const fileError =
        error as NodeJS.ErrnoException;

      if (fileError.code !== 'ENOENT') {
        throw error;
      }
    }

    await this.prisma.reportAttachment.delete({
      where: {
        id: attachment.id,
      },
    });

    return {
      id: attachment.id,
    };
  }

  async getAttachmentFile(
    reportId: string,
    attachmentId: string,
    userId: string,
  ) {
    const attachment = await this.prisma.reportAttachment.findFirst({
      where: {
        id: attachmentId,
        reportId,
        report: {
          reporterId: userId,
        },
      },
      select: {
        id: true,
        mimeType: true,
      },
    });

    if (!attachment || !attachment.mimeType) {
      throw new NotFoundException('Evidencia no encontrada.');
    }

    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };

    const extension = extensions[attachment.mimeType];

    if (!extension) {
      throw new NotFoundException('Evidencia no encontrada.');
    }

    const filePath = join(
      process.cwd(),
      'uploads',
      'reports',
      reportId,
      `${attachment.id}${extension}`,
    );

    try {
      const buffer = await readFile(filePath);

      return {
        buffer,
        mimeType: attachment.mimeType,
      };
    } catch {
      throw new NotFoundException('Evidencia no encontrada.');
    }
  }}