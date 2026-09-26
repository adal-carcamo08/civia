jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  readFile: jest.fn(),
  unlink: jest.fn(),
  writeFile: jest.fn(),
}));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  mkdir,
  readFile,
  unlink,
  writeFile,
} from 'fs/promises';
import { join } from 'path';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const membershipFindUniqueMock = jest.fn();
  const membershipFindFirstMock = jest.fn();
  const categoryFindFirstMock = jest.fn();
  const reportCreateMock = jest.fn();
  const reportUpdateMock = jest.fn();
  const reportFindManyMock = jest.fn();
  const reportFindFirstMock = jest.fn();
  const reportAttachmentFindFirstMock = jest.fn();
  const reportAttachmentCreateMock = jest.fn();
  const reportAttachmentDeleteMock = jest.fn();
  const historyCreateMock = jest.fn();
  const transactionMock = jest.fn();

  const mkdirMock = mkdir as jest.MockedFunction<typeof mkdir>;
  const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
  const unlinkMock = unlink as jest.MockedFunction<typeof unlink>;
  const writeFileMock = writeFile as jest.MockedFunction<typeof writeFile>;

  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();

    const tx = {
      report: {
        create: reportCreateMock,
        update: reportUpdateMock,
      },
      reportStatusHistory: {
        create: historyCreateMock,
      },
    };

    transactionMock.mockImplementation(
      async (callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
    );

    const prisma = {
      membership: {
        findUnique: membershipFindUniqueMock,
        findFirst: membershipFindFirstMock,
      },
      category: {
        findFirst: categoryFindFirstMock,
      },
      report: {
        findMany: reportFindManyMock,
        findFirst: reportFindFirstMock,
      },
      reportAttachment: {
        findFirst: reportAttachmentFindFirstMock,
        create: reportAttachmentCreateMock,
        delete: reportAttachmentDeleteMock,
      },
      $transaction: transactionMock,
    };

    service = new ReportsService(prisma as never);
  });

  it('crea un reporte y registra su estado inicial en el historial', async () => {
    const createdAt = new Date('2026-09-23T15:53:46.835Z');

    membershipFindUniqueMock.mockResolvedValue({
      status: 'ACTIVE',
    });

    categoryFindFirstMock.mockResolvedValue({
      id: 'category-1',
      departmentId: 'department-1',
    });

    reportCreateMock.mockImplementation(async ({ data }) => ({
      id: 'report-1',
      code: data.code,
      status: data.status,
      description: data.description,
      location: data.location,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      createdAt,
      organization: {
        id: 'organization-1',
        name: 'Organización Demo CIVIA',
      },
      category: {
        id: 'category-1',
        name: 'Fuga de agua',
      },
      department: {
        id: 'department-1',
        name: 'Mantenimiento',
      },
    }));

    historyCreateMock.mockResolvedValue({
      id: 'history-1',
    });

    const result = await service.create('user-1', {
      organizationId: 'organization-1',
      categoryId: 'category-1',
      description:
        '  Existe una fuga de agua constante en la tubería principal.  ',
      location: '  Entrada principal del edificio  ',
    });

    expect(membershipFindUniqueMock).toHaveBeenCalledWith({
      where: {
        userId_organizationId: {
          userId: 'user-1',
          organizationId: 'organization-1',
        },
      },
      select: {
        status: true,
      },
    });

    expect(categoryFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: 'category-1',
        organizationId: 'organization-1',
        active: true,
      },
      select: {
        id: true,
        departmentId: true,
      },
    });

    const createArgs = reportCreateMock.mock.calls[0][0];

    expect(createArgs.data.code).toMatch(
      /^CIVIA-[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/,
    );
    expect(createArgs.data.reporterId).toBe('user-1');
    expect(createArgs.data.organizationId).toBe('organization-1');
    expect(createArgs.data.categoryId).toBe('category-1');
    expect(createArgs.data.departmentId).toBe('department-1');
    expect(createArgs.data.status).toBe('RECEIVED');
    expect(createArgs.data.description).toBe(
      'Existe una fuga de agua constante en la tubería principal.',
    );
    expect(createArgs.data.location).toBe(
      'Entrada principal del edificio',
    );

    expect(historyCreateMock).toHaveBeenCalledWith({
      data: {
        reportId: 'report-1',
        fromStatus: null,
        toStatus: 'RECEIVED',
        changedByUserId: 'user-1',
        note: 'Reporte creado.',
      },
    });

    expect(result.status).toBe('RECEIVED');
    expect(result.department).toEqual({
      id: 'department-1',
      name: 'Mantenimiento',
    });
  });

  it('rechaza crear un reporte sin membresía activa', async () => {
    membershipFindUniqueMock.mockResolvedValue(null);

    await expect(
      service.create('user-1', {
        organizationId: 'organization-1',
        categoryId: 'category-1',
        description: 'Descripción suficientemente extensa.',
        location: 'Entrada principal',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(categoryFindFirstMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rechaza crear un reporte con membresía no activa', async () => {
    membershipFindUniqueMock.mockResolvedValue({
      status: 'PENDING',
    });

    await expect(
      service.create('user-1', {
        organizationId: 'organization-1',
        categoryId: 'category-1',
        description: 'Descripción suficientemente extensa.',
        location: 'Entrada principal',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(categoryFindFirstMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rechaza una categoría inexistente, inactiva o de otra organización', async () => {
    membershipFindUniqueMock.mockResolvedValue({
      status: 'ACTIVE',
    });

    categoryFindFirstMock.mockResolvedValue(null);

    await expect(
      service.create('user-1', {
        organizationId: 'organization-1',
        categoryId: 'category-invalid',
        description: 'Descripción suficientemente extensa.',
        location: 'Entrada principal',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rechaza texto vacío después de normalizar espacios', async () => {
    membershipFindUniqueMock.mockResolvedValue({
      status: 'ACTIVE',
    });

    categoryFindFirstMock.mockResolvedValue({
      id: 'category-1',
      departmentId: 'department-1',
    });

    await expect(
      service.create('user-1', {
        organizationId: 'organization-1',
        categoryId: 'category-1',
        description: '          ',
        location: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(transactionMock).not.toHaveBeenCalled();
  });

  describe('update', () => {
    it('edita un reporte recibido, actualiza categoría y departamento y registra la edición', async () => {
      const updatedAt = new Date(
        '2026-09-26T15:00:00.000Z'
      );

      reportFindFirstMock.mockResolvedValue({
        id: 'report-1',
        status: 'RECEIVED',
        organizationId: 'organization-1',
      });

      categoryFindFirstMock.mockResolvedValue({
        id: 'category-2',
        departmentId: 'department-2',
      });

      reportUpdateMock.mockResolvedValue({
        id: 'report-1',
        code: 'CIVIA-REPORT-1',
        status: 'RECEIVED',
        description: 'Descripción actualizada del reporte.',
        location: 'Nueva ubicación',
        updatedAt,
        category: {
          id: 'category-2',
          name: 'Alumbrado público',
        },
        department: {
          id: 'department-2',
          name: 'Mantenimiento',
        },
      });

      historyCreateMock.mockResolvedValue({
        id: 'history-update-1',
      });

      const result = await service.update(
        'report-1',
        'user-1',
        {
          categoryId: 'category-2',
          description:
            '  Descripción actualizada del reporte.  ',
          location: '  Nueva ubicación  ',
        }
      );

      expect(reportFindFirstMock).toHaveBeenCalledWith({
        where: {
          id: 'report-1',
          reporterId: 'user-1',
        },
        select: {
          id: true,
          status: true,
          organizationId: true,
        },
      });

      expect(categoryFindFirstMock).toHaveBeenCalledWith({
        where: {
          id: 'category-2',
          organizationId: 'organization-1',
          active: true,
        },
        select: {
          id: true,
          departmentId: true,
        },
      });

      expect(reportUpdateMock).toHaveBeenCalledWith({
        where: {
          id: 'report-1',
        },
        data: {
          categoryId: 'category-2',
          departmentId: 'department-2',
          description:
            'Descripción actualizada del reporte.',
          location: 'Nueva ubicación',
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

      expect(historyCreateMock).toHaveBeenCalledWith({
        data: {
          reportId: 'report-1',
          fromStatus: 'RECEIVED',
          toStatus: 'RECEIVED',
          changedByUserId: 'user-1',
          note: 'Reporte editado por el usuario.',
        },
      });

      expect(result.description).toBe(
        'Descripción actualizada del reporte.'
      );
    });

    it('permite una edición parcial sin modificar campos no enviados', async () => {
      reportFindFirstMock.mockResolvedValue({
        id: 'report-1',
        status: 'RECEIVED',
        organizationId: 'organization-1',
      });

      reportUpdateMock.mockResolvedValue({
        id: 'report-1',
        code: 'CIVIA-REPORT-1',
        status: 'RECEIVED',
        description:
          'Nueva descripción suficientemente extensa.',
        location: 'Ubicación original',
        updatedAt: new Date(
          '2026-09-26T15:05:00.000Z'
        ),
        category: {
          id: 'category-1',
          name: 'Fuga de agua',
        },
        department: {
          id: 'department-1',
          name: 'Mantenimiento',
        },
      });

      historyCreateMock.mockResolvedValue({
        id: 'history-update-2',
      });

      await service.update(
        'report-1',
        'user-1',
        {
          description:
            '  Nueva descripción suficientemente extensa.  ',
        }
      );

      expect(categoryFindFirstMock).not.toHaveBeenCalled();

      expect(reportUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            description:
              'Nueva descripción suficientemente extensa.',
          },
        })
      );
    });

    it('rechaza una edición sin campos para actualizar', async () => {
      await expect(
        service.update(
          'report-1',
          'user-1',
          {}
        )
      ).rejects.toBeInstanceOf(
        BadRequestException
      );

      expect(reportFindFirstMock).not.toHaveBeenCalled();
      expect(transactionMock).not.toHaveBeenCalled();
    });

    it('rechaza editar un reporte inexistente o de otro usuario', async () => {
      reportFindFirstMock.mockResolvedValue(null);

      await expect(
        service.update(
          'report-1',
          'user-2',
          {
            description:
              'Descripción suficientemente extensa.',
          }
        )
      ).rejects.toBeInstanceOf(
        NotFoundException
      );

      expect(transactionMock).not.toHaveBeenCalled();
      expect(reportUpdateMock).not.toHaveBeenCalled();
    });

    it('rechaza editar un reporte que ya no está recibido', async () => {
      reportFindFirstMock.mockResolvedValue({
        id: 'report-1',
        status: 'UNDER_REVIEW',
        organizationId: 'organization-1',
      });

      await expect(
        service.update(
          'report-1',
          'user-1',
          {
            location: 'Nueva ubicación',
          }
        )
      ).rejects.toBeInstanceOf(
        BadRequestException
      );

      expect(categoryFindFirstMock).not.toHaveBeenCalled();
      expect(transactionMock).not.toHaveBeenCalled();
      expect(reportUpdateMock).not.toHaveBeenCalled();
    });

    it('rechaza cambiar a una categoría inexistente o de otra organización', async () => {
      reportFindFirstMock.mockResolvedValue({
        id: 'report-1',
        status: 'RECEIVED',
        organizationId: 'organization-1',
      });

      categoryFindFirstMock.mockResolvedValue(null);

      await expect(
        service.update(
          'report-1',
          'user-1',
          {
            categoryId: 'category-invalid',
          }
        )
      ).rejects.toBeInstanceOf(
        NotFoundException
      );

      expect(categoryFindFirstMock).toHaveBeenCalledWith({
        where: {
          id: 'category-invalid',
          organizationId: 'organization-1',
          active: true,
        },
        select: {
          id: true,
          departmentId: true,
        },
      });

      expect(transactionMock).not.toHaveBeenCalled();
      expect(reportUpdateMock).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('cancela un reporte recibido y registra el cambio en el historial', async () => {
      const updatedAt = new Date(
        '2026-09-26T14:30:00.000Z'
      );

      reportFindFirstMock.mockResolvedValue({
        id: 'report-1',
        code: 'CIVIA-REPORT-1',
        status: 'RECEIVED',
      });

      reportUpdateMock.mockResolvedValue({
        id: 'report-1',
        code: 'CIVIA-REPORT-1',
        status: 'CANCELLED',
        updatedAt,
      });

      historyCreateMock.mockResolvedValue({
        id: 'history-cancel-1',
      });

      const result = await service.cancel(
        'report-1',
        'user-1'
      );

      expect(reportFindFirstMock).toHaveBeenCalledWith({
        where: {
          id: 'report-1',
          reporterId: 'user-1',
        },
        select: {
          id: true,
          code: true,
          status: true,
        },
      });

      expect(reportUpdateMock).toHaveBeenCalledWith({
        where: {
          id: 'report-1',
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

      expect(historyCreateMock).toHaveBeenCalledWith({
        data: {
          reportId: 'report-1',
          fromStatus: 'RECEIVED',
          toStatus: 'CANCELLED',
          changedByUserId: 'user-1',
          note: 'Reporte cancelado por el usuario.',
        },
      });

      expect(result).toEqual({
        id: 'report-1',
        code: 'CIVIA-REPORT-1',
        status: 'CANCELLED',
        updatedAt,
      });
    });

    it('permite cancelar un reporte en revisión', async () => {
      reportFindFirstMock.mockResolvedValue({
        id: 'report-2',
        code: 'CIVIA-REPORT-2',
        status: 'UNDER_REVIEW',
      });

      reportUpdateMock.mockResolvedValue({
        id: 'report-2',
        code: 'CIVIA-REPORT-2',
        status: 'CANCELLED',
        updatedAt: new Date(
          '2026-09-26T14:35:00.000Z'
        ),
      });

      historyCreateMock.mockResolvedValue({
        id: 'history-cancel-2',
      });

      await service.cancel(
        'report-2',
        'user-1'
      );

      expect(historyCreateMock).toHaveBeenCalledWith({
        data: {
          reportId: 'report-2',
          fromStatus: 'UNDER_REVIEW',
          toStatus: 'CANCELLED',
          changedByUserId: 'user-1',
          note: 'Reporte cancelado por el usuario.',
        },
      });
    });

    it('rechaza cancelar un reporte inexistente o de otro usuario', async () => {
      reportFindFirstMock.mockResolvedValue(null);

      await expect(
        service.cancel(
          'report-1',
          'user-2'
        )
      ).rejects.toBeInstanceOf(
        NotFoundException
      );

      expect(transactionMock).not.toHaveBeenCalled();
      expect(reportUpdateMock).not.toHaveBeenCalled();
      expect(historyCreateMock).not.toHaveBeenCalled();
    });

    it('rechaza cancelar un reporte que ya está en proceso', async () => {
      reportFindFirstMock.mockResolvedValue({
        id: 'report-1',
        code: 'CIVIA-REPORT-1',
        status: 'IN_PROGRESS',
      });

      await expect(
        service.cancel(
          'report-1',
          'user-1'
        )
      ).rejects.toBeInstanceOf(
        BadRequestException
      );

      expect(transactionMock).not.toHaveBeenCalled();
      expect(reportUpdateMock).not.toHaveBeenCalled();
      expect(historyCreateMock).not.toHaveBeenCalled();
    });

    it('rechaza cancelar nuevamente un reporte ya cancelado', async () => {
      reportFindFirstMock.mockResolvedValue({
        id: 'report-1',
        code: 'CIVIA-REPORT-1',
        status: 'CANCELLED',
      });

      await expect(
        service.cancel(
          'report-1',
          'user-1'
        )
      ).rejects.toBeInstanceOf(
        BadRequestException
      );

      expect(transactionMock).not.toHaveBeenCalled();
      expect(reportUpdateMock).not.toHaveBeenCalled();
      expect(historyCreateMock).not.toHaveBeenCalled();
    });
  });

  describe('findMine', () => {
    it('devuelve únicamente los reportes del usuario autenticado ordenados por fecha', async () => {
      const createdAt = new Date('2026-09-23T15:53:46.835Z');
      const updatedAt = new Date('2026-09-23T15:53:46.835Z');

      reportFindManyMock.mockResolvedValue([
        {
          id: 'report-1',
          code: 'CIVIA-REPORT-1',
          status: 'RECEIVED',
          description: 'Existe una fuga de agua constante.',
          location: 'Entrada principal',
          latitude: null,
          longitude: null,
          resolvedAt: null,
          createdAt,
          updatedAt,
          organization: {
            id: 'organization-1',
            name: 'Organización Demo CIVIA',
          },
          category: {
            id: 'category-1',
            name: 'Fuga de agua',
          },
          department: {
            id: 'department-1',
            name: 'Mantenimiento',
          },
          attachments: [],
        },
      ]);

      const result = await service.findMine('user-1');

      expect(reportFindManyMock).toHaveBeenCalledWith({
        where: {
          reporterId: 'user-1',
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

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('report-1');
      expect(result[0].organization.name).toBe(
        'Organización Demo CIVIA',
      );
    });

    it('devuelve un arreglo vacío cuando el usuario no tiene reportes', async () => {
      reportFindManyMock.mockResolvedValue([]);

      const result = await service.findMine('user-2');

      expect(result).toEqual([]);
      expect(reportFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            reporterId: 'user-2',
          },
        }),
      );
    });
  });
  describe('findOneMine', () => {
    it('devuelve el detalle completo de un reporte del usuario', async () => {
      const createdAt = new Date('2026-09-23T15:53:46.835Z');
      const updatedAt = new Date('2026-09-23T15:53:46.835Z');
      const historyCreatedAt = new Date('2026-09-23T15:53:46.858Z');

      reportFindFirstMock.mockResolvedValue({
        id: 'report-1',
        code: 'CIVIA-REPORT-1',
        status: 'RECEIVED',
        description:
          'Existe una fuga de agua constante en la tubería principal.',
        location: 'Entrada principal del edificio',
        latitude: null,
        longitude: null,
        resolvedAt: null,
        createdAt,
        updatedAt,
        organization: {
          id: 'organization-1',
          name: 'Organización Demo CIVIA',
        },
        category: {
          id: 'category-1',
          name: 'Fuga de agua',
        },
        department: {
          id: 'department-1',
          name: 'Mantenimiento',
        },
        assignedTo: null,
        attachments: [],
        history: [
          {
            id: 'history-1',
            fromStatus: null,
            toStatus: 'RECEIVED',
            note: 'Reporte creado.',
            createdAt: historyCreatedAt,
            changedBy: {
              id: 'user-1',
              fullName: 'Usuario CIVIA',
            },
          },
        ],
      });

      const result = await service.findOneMine(
        'report-1',
        'user-1',
      );

      expect(reportFindFirstMock).toHaveBeenCalledWith({
        where: {
          id: 'report-1',
          reporterId: 'user-1',
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

      expect(result.id).toBe('report-1');
      expect(result.status).toBe('RECEIVED');
      expect(result.organization.name).toBe(
        'Organización Demo CIVIA',
      );
      expect(result.category.name).toBe('Fuga de agua');
      expect(result.department?.name).toBe('Mantenimiento');
      expect(result.history).toHaveLength(1);
      expect(result.history[0].toStatus).toBe('RECEIVED');
      expect(result.history[0].changedBy?.fullName).toBe(
        'Usuario CIVIA',
      );
    });

    it('rechaza un reporte inexistente o perteneciente a otro usuario', async () => {
      reportFindFirstMock.mockResolvedValue(null);

      await expect(
        service.findOneMine(
          'report-1',
          'user-2',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(reportFindFirstMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'report-1',
            reporterId: 'user-2',
          },
        }),
      );
    });
  });
  describe('findByOrganization', () => {
    it('devuelve los reportes de una organización para un miembro activo', async () => {
      const createdAt = new Date('2026-09-23T15:53:46.835Z');
      const updatedAt = new Date('2026-09-23T15:53:46.835Z');

      membershipFindFirstMock.mockResolvedValue({
        id: 'membership-1',
        role: 'MEMBER',
      });

      reportFindManyMock.mockResolvedValue([
        {
          id: 'report-1',
          code: 'CIVIA-REPORT-1',
          status: 'RECEIVED',
          description:
            'Existe una fuga de agua constante en la tubería principal.',
          location: 'Entrada principal del edificio',
          resolvedAt: null,
          createdAt,
          updatedAt,
          reporter: {
            id: 'user-1',
            fullName: 'Usuario CIVIA',
          },
          category: {
            id: 'category-1',
            name: 'Fuga de agua',
          },
          department: {
            id: 'department-1',
            name: 'Mantenimiento',
          },
          assignedTo: null,
        },
      ]);

      const result = await service.findByOrganization(
        'organization-1',
        'user-1',
      );

      expect(membershipFindFirstMock).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          organizationId: 'organization-1',
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

      expect(reportFindManyMock).toHaveBeenCalledWith({
        where: {
          organizationId: 'organization-1',
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

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('report-1');
      expect(result[0].reporter.fullName).toBe('Usuario CIVIA');
      expect(result[0].category.name).toBe('Fuga de agua');
      expect(result[0].department?.name).toBe('Mantenimiento');
    });

    it('rechaza consultar reportes si el usuario no es miembro activo', async () => {
      membershipFindFirstMock.mockResolvedValue(null);

      await expect(
        service.findByOrganization(
          'organization-1',
          'user-2',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(reportFindManyMock).not.toHaveBeenCalled();
    });
  });
  describe('attachments', () => {
    it('guarda una imagen y crea el registro del adjunto', async () => {
      reportFindFirstMock.mockResolvedValue({
        id: 'report-1',
        status: 'RECEIVED',
        _count: {
          attachments: 0,
        },
      });

      mkdirMock.mockResolvedValue(undefined);
      writeFileMock.mockResolvedValue(undefined);

      reportAttachmentCreateMock.mockImplementation(
        async ({ data }) => ({
          id: data.id,
          url: data.url,
          fileName: data.fileName,
          mimeType: data.mimeType,
          createdAt: new Date('2026-09-23T16:20:08.489Z'),
        }),
      );

      const file = {
        buffer: Buffer.from('image-data'),
        mimetype: 'image/png',
        originalname: 'evidencia.png',
      } as Express.Multer.File;

      const result = await service.addAttachment(
        'report-1',
        'user-1',
        file,
      );

      expect(reportFindFirstMock).toHaveBeenCalledWith({
        where: {
          id: 'report-1',
          reporterId: 'user-1',
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

      expect(mkdirMock).toHaveBeenCalledWith(
        join(
          process.cwd(),
          'uploads',
          'reports',
          'report-1',
        ),
        {
          recursive: true,
        },
      );

      expect(writeFileMock).toHaveBeenCalledTimes(1);

      const createArgs =
        reportAttachmentCreateMock.mock.calls[0][0];

      expect(createArgs.data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      expect(createArgs.data.reportId).toBe('report-1');
      expect(createArgs.data.fileName).toBe('evidencia.png');
      expect(createArgs.data.mimeType).toBe('image/png');
      expect(createArgs.data.url).toBe(
        `/reports/report-1/attachments/${createArgs.data.id}/file`,
      );

      expect(result.id).toBe(createArgs.data.id);
    });

    it('rechaza agregar evidencia a un reporte ajeno o inexistente', async () => {
      reportFindFirstMock.mockResolvedValue(null);

      const file = {
        buffer: Buffer.from('image-data'),
        mimetype: 'image/png',
        originalname: 'evidencia.png',
      } as Express.Multer.File;

      await expect(
        service.addAttachment(
          'report-1',
          'user-2',
          file,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(mkdirMock).not.toHaveBeenCalled();
      expect(writeFileMock).not.toHaveBeenCalled();
      expect(reportAttachmentCreateMock).not.toHaveBeenCalled();
    });

    it('rechaza un tipo de archivo no permitido', async () => {
      reportFindFirstMock.mockResolvedValue({
        id: 'report-1',
        status: 'RECEIVED',
        _count: {
          attachments: 0,
        },
      });

      const file = {
        buffer: Buffer.from('document-data'),
        mimetype: 'application/pdf',
        originalname: 'documento.pdf',
      } as Express.Multer.File;

      await expect(
        service.addAttachment(
          'report-1',
          'user-1',
          file,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(writeFileMock).not.toHaveBeenCalled();
      expect(reportAttachmentCreateMock).not.toHaveBeenCalled();
    });

    it('rechaza agregar evidencia cuando el reporte ya está en revisión', async () => {
      reportFindFirstMock.mockResolvedValue({
        id: 'report-1',
        status: 'UNDER_REVIEW',
        _count: {
          attachments: 2,
        },
      });

      const file = {
        buffer: Buffer.from('image-data'),
        mimetype: 'image/png',
        originalname: 'evidencia.png',
      } as Express.Multer.File;

      await expect(
        service.addAttachment(
          'report-1',
          'user-1',
          file,
        ),
      ).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(mkdirMock).not.toHaveBeenCalled();
      expect(writeFileMock).not.toHaveBeenCalled();
      expect(reportAttachmentCreateMock).not.toHaveBeenCalled();
    });

    it('rechaza agregar más de cinco evidencias al mismo reporte', async () => {
      reportFindFirstMock.mockResolvedValue({
        id: 'report-1',
        status: 'RECEIVED',
        _count: {
          attachments: 5,
        },
      });

      const file = {
        buffer: Buffer.from('image-data'),
        mimetype: 'image/png',
        originalname: 'sexta-evidencia.png',
      } as Express.Multer.File;

      await expect(
        service.addAttachment(
          'report-1',
          'user-1',
          file,
        ),
      ).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(mkdirMock).not.toHaveBeenCalled();
      expect(writeFileMock).not.toHaveBeenCalled();
      expect(reportAttachmentCreateMock).not.toHaveBeenCalled();
    });

    it('elimina una evidencia de un reporte recibido', async () => {
      reportAttachmentFindFirstMock.mockResolvedValue({
        id: 'attachment-1',
        mimeType: 'image/png',
        report: {
          status: 'RECEIVED',
        },
      });

      unlinkMock.mockResolvedValue(undefined);

      reportAttachmentDeleteMock.mockResolvedValue({
        id: 'attachment-1',
      });

      const result = await service.removeAttachment(
        'report-1',
        'attachment-1',
        'user-1',
      );

      expect(
        reportAttachmentFindFirstMock
      ).toHaveBeenCalledWith({
        where: {
          id: 'attachment-1',
          reportId: 'report-1',
          report: {
            reporterId: 'user-1',
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

      expect(unlinkMock).toHaveBeenCalledWith(
        join(
          process.cwd(),
          'uploads',
          'reports',
          'report-1',
          'attachment-1.png',
        ),
      );

      expect(
        reportAttachmentDeleteMock
      ).toHaveBeenCalledWith({
        where: {
          id: 'attachment-1',
        },
      });

      expect(result).toEqual({
        id: 'attachment-1',
      });
    });

    it('rechaza eliminar una evidencia ajena o inexistente', async () => {
      reportAttachmentFindFirstMock.mockResolvedValue(
        null
      );

      await expect(
        service.removeAttachment(
          'report-1',
          'attachment-1',
          'user-2',
        ),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(unlinkMock).not.toHaveBeenCalled();
      expect(
        reportAttachmentDeleteMock
      ).not.toHaveBeenCalled();
    });

    it('rechaza eliminar una evidencia cuando el reporte ya está en revisión', async () => {
      reportAttachmentFindFirstMock.mockResolvedValue({
        id: 'attachment-1',
        mimeType: 'image/png',
        report: {
          status: 'UNDER_REVIEW',
        },
      });

      await expect(
        service.removeAttachment(
          'report-1',
          'attachment-1',
          'user-1',
        ),
      ).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(unlinkMock).not.toHaveBeenCalled();
      expect(
        reportAttachmentDeleteMock
      ).not.toHaveBeenCalled();
    });

    it('devuelve el archivo de una evidencia autorizada', async () => {
      const fileBuffer = Buffer.from('image-data');

      reportAttachmentFindFirstMock.mockResolvedValue({
        id: 'attachment-1',
        mimeType: 'image/png',
      });

      readFileMock.mockResolvedValue(fileBuffer);

      const result = await service.getAttachmentFile(
        'report-1',
        'attachment-1',
        'user-1',
      );

      expect(reportAttachmentFindFirstMock).toHaveBeenCalledWith({
        where: {
          id: 'attachment-1',
          reportId: 'report-1',
          report: {
            reporterId: 'user-1',
          },
        },
        select: {
          id: true,
          mimeType: true,
        },
      });

      expect(readFileMock).toHaveBeenCalledWith(
        join(
          process.cwd(),
          'uploads',
          'reports',
          'report-1',
          'attachment-1.png',
        ),
      );

      expect(result).toEqual({
        buffer: fileBuffer,
        mimeType: 'image/png',
      });
    });

    it('rechaza descargar una evidencia ajena o inexistente', async () => {
      reportAttachmentFindFirstMock.mockResolvedValue(null);

      await expect(
        service.getAttachmentFile(
          'report-1',
          'attachment-1',
          'user-2',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(readFileMock).not.toHaveBeenCalled();
    });

    it('responde como no encontrada si falta el archivo físico', async () => {
      reportAttachmentFindFirstMock.mockResolvedValue({
        id: 'attachment-1',
        mimeType: 'image/png',
      });

      readFileMock.mockRejectedValue(
        new Error('ENOENT'),
      );

      await expect(
        service.getAttachmentFile(
          'report-1',
          'attachment-1',
          'user-1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(unlinkMock).not.toHaveBeenCalled();
    });
  });});