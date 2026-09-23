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
  const categoryFindFirstMock = jest.fn();
  const reportCreateMock = jest.fn();
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
      },
      category: {
        findFirst: categoryFindFirstMock,
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
});