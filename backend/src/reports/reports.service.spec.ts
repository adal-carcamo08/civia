jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const membershipFindUniqueMock = jest.fn();
  const membershipFindFirstMock = jest.fn();
  const categoryFindFirstMock = jest.fn();
  const reportCreateMock = jest.fn();
  const reportFindManyMock = jest.fn();
  const reportFindFirstMock = jest.fn();
  const historyCreateMock = jest.fn();
  const transactionMock = jest.fn();

  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();

    const tx = {
      report: {
        create: reportCreateMock,
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
  });});