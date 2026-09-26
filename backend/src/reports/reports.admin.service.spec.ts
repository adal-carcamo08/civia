jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';

describe('ReportsService - administración', () => {
  const userFindUniqueMock = jest.fn();
  const organizationFindFirstMock = jest.fn();
  const membershipFindFirstMock = jest.fn();
  const reportFindManyMock = jest.fn();
  const reportFindFirstMock = jest.fn();
  const reportUpdateMock = jest.fn();
  const departmentFindFirstMock = jest.fn();
  const historyCreateMock = jest.fn();
  const reportAttachmentFindFirstMock = jest.fn();
  const transactionMock = jest.fn();

  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();

    const tx = {
      report: {
        update: reportUpdateMock,
      },
      reportStatusHistory: {
        create: historyCreateMock,
      },
    };

    transactionMock.mockImplementation(
      async (
        callback: (
          transaction: typeof tx
        ) => unknown,
      ) => callback(tx),
    );

    const prisma = {
      user: {
        findUnique: userFindUniqueMock,
      },
      organization: {
        findFirst:
          organizationFindFirstMock,
      },
      membership: {
        findFirst:
          membershipFindFirstMock,
      },
      report: {
        findMany:
          reportFindManyMock,
        findFirst:
          reportFindFirstMock,
      },
      department: {
        findFirst:
          departmentFindFirstMock,
      },
      reportAttachment: {
        findFirst:
          reportAttachmentFindFirstMock,
      },
      $transaction:
        transactionMock,
    };

    service = new ReportsService(
      prisma as never,
    );
  });

  it('rechaza la gestión administrativa a un MEMBER', async () => {
    userFindUniqueMock.mockResolvedValue({
      id: 'user-member',
      role: 'USER',
      active: true,
    });

    membershipFindFirstMock.mockResolvedValue(
      null,
    );

    await expect(
      service.findAdminReports(
        'organization-1',
        'user-member',
      ),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(
      reportFindManyMock,
    ).not.toHaveBeenCalled();
  });

  it('permite a STAFF consultar la bandeja administrativa', async () => {
    userFindUniqueMock.mockResolvedValue({
      id: 'user-staff',
      role: 'USER',
      active: true,
    });

    membershipFindFirstMock.mockResolvedValue({
      role: 'STAFF',
    });

    reportFindManyMock.mockResolvedValue([
      {
        id: 'report-1',
        code: 'CIVIA-REPORT-1',
        status: 'RECEIVED',
      },
    ]);

    const result =
      await service.findAdminReports(
        'organization-1',
        'user-staff',
      );

    expect(result).toHaveLength(1);

    expect(
      membershipFindFirstMock,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-staff',
          organizationId:
            'organization-1',
          status: 'ACTIVE',
          role: {
            in: ['STAFF', 'ADMIN'],
          },
        }),
      }),
    );

    expect(
      reportFindManyMock,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId:
            'organization-1',
        },
      }),
    );
  });

  it('permite a GLOBAL_ADMIN gestionar una organización activa sin membresía', async () => {
    userFindUniqueMock.mockResolvedValue({
      id: 'global-admin',
      role: 'GLOBAL_ADMIN',
      active: true,
    });

    organizationFindFirstMock.mockResolvedValue({
      id: 'organization-1',
    });

    reportFindManyMock.mockResolvedValue(
      [],
    );

    const result =
      await service.findAdminReports(
        'organization-1',
        'global-admin',
      );

    expect(result).toEqual([]);

    expect(
      organizationFindFirstMock,
    ).toHaveBeenCalledWith({
      where: {
        id: 'organization-1',
        active: true,
      },
      select: {
        id: true,
      },
    });

    expect(
      membershipFindFirstMock,
    ).not.toHaveBeenCalled();
  });

  it('permite pasar un reporte de RECEIVED a UNDER_REVIEW y registra historial', async () => {
    userFindUniqueMock.mockResolvedValue({
      id: 'admin-1',
      role: 'USER',
      active: true,
    });

    membershipFindFirstMock.mockResolvedValue({
      role: 'ADMIN',
    });

    reportFindFirstMock.mockResolvedValue({
      id: 'report-1',
      status: 'RECEIVED',
      assignedToUserId: null,
    });

    reportUpdateMock.mockResolvedValue({
      id: 'report-1',
      code: 'CIVIA-REPORT-1',
      status: 'UNDER_REVIEW',
      resolvedAt: null,
      updatedAt: new Date(),
    });

    historyCreateMock.mockResolvedValue({
      id: 'history-1',
    });

    const result =
      await service.updateOrganizationReportStatus(
        'organization-1',
        'report-1',
        'admin-1',
        {
          status: 'UNDER_REVIEW',
          note: 'El caso será revisado.',
        },
      );

    expect(result.status).toBe(
      'UNDER_REVIEW',
    );

    expect(
      reportUpdateMock,
    ).toHaveBeenCalledWith({
      where: {
        id: 'report-1',
      },
      data: {
        status: 'UNDER_REVIEW',
      },
      select: {
        id: true,
        code: true,
        status: true,
        resolvedAt: true,
        updatedAt: true,
      },
    });

    expect(
      historyCreateMock,
    ).toHaveBeenCalledWith({
      data: {
        reportId: 'report-1',
        fromStatus: 'RECEIVED',
        toStatus: 'UNDER_REVIEW',
        changedByUserId: 'admin-1',
        note: 'El caso será revisado.',
      },
    });
  });

  it('impide saltar directamente de RECEIVED a RESOLVED', async () => {
    userFindUniqueMock.mockResolvedValue({
      id: 'admin-1',
      role: 'USER',
      active: true,
    });

    membershipFindFirstMock.mockResolvedValue({
      role: 'ADMIN',
    });

    reportFindFirstMock.mockResolvedValue({
      id: 'report-1',
      status: 'RECEIVED',
      assignedToUserId: null,
    });

    await expect(
      service.updateOrganizationReportStatus(
        'organization-1',
        'report-1',
        'admin-1',
        {
          status: 'RESOLVED',
        },
      ),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(
      transactionMock,
    ).not.toHaveBeenCalled();
  });

  it('asigna departamento y responsable y cambia el reporte a ASSIGNED', async () => {
    userFindUniqueMock.mockResolvedValue({
      id: 'admin-1',
      role: 'USER',
      active: true,
    });

    membershipFindFirstMock
      .mockResolvedValueOnce({
        role: 'ADMIN',
      })
      .mockResolvedValueOnce({
        user: {
          id: 'staff-1',
          fullName:
            'Responsable CIVIA',
          email:
            'responsable@civia.com',
        },
      });

    reportFindFirstMock.mockResolvedValue({
      id: 'report-1',
      status: 'UNDER_REVIEW',
    });

    departmentFindFirstMock.mockResolvedValue({
      id: 'department-1',
      name: 'Mantenimiento',
    });

    reportUpdateMock.mockResolvedValue({
      id: 'report-1',
      code: 'CIVIA-REPORT-1',
      status: 'ASSIGNED',
      department: {
        id: 'department-1',
        name: 'Mantenimiento',
      },
      assignedTo: {
        id: 'staff-1',
        fullName:
          'Responsable CIVIA',
        email:
          'responsable@civia.com',
      },
      updatedAt: new Date(),
    });

    historyCreateMock.mockResolvedValue({
      id: 'history-assignment-1',
    });

    const result =
      await service.assignOrganizationReport(
        'organization-1',
        'report-1',
        'admin-1',
        {
          departmentId:
            'department-1',
          assignedToUserId:
            'staff-1',
        },
      );

    expect(result.status).toBe(
      'ASSIGNED',
    );

    expect(
      departmentFindFirstMock,
    ).toHaveBeenCalledWith({
      where: {
        id: 'department-1',
        organizationId:
          'organization-1',
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    expect(
      reportUpdateMock,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'report-1',
        },
        data: {
          departmentId:
            'department-1',
          assignedToUserId:
            'staff-1',
          status: 'ASSIGNED',
        },
      }),
    );

    expect(
      historyCreateMock,
    ).toHaveBeenCalledWith({
      data: {
        reportId: 'report-1',
        fromStatus:
          'UNDER_REVIEW',
        toStatus: 'ASSIGNED',
        changedByUserId:
          'admin-1',
        note:
          'Reporte asignado a Responsable CIVIA en Mantenimiento.',
      },
    });
  });

  it('impide iniciar trabajo si el reporte no tiene responsable asignado', async () => {
    userFindUniqueMock.mockResolvedValue({
      id: 'staff-1',
      role: 'USER',
      active: true,
    });

    membershipFindFirstMock.mockResolvedValue({
      role: 'STAFF',
    });

    reportFindFirstMock.mockResolvedValue({
      id: 'report-1',
      status: 'ASSIGNED',
      assignedToUserId: null,
    });

    await expect(
      service.updateOrganizationReportStatus(
        'organization-1',
        'report-1',
        'staff-1',
        {
          status: 'IN_PROGRESS',
        },
      ),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(
      transactionMock,
    ).not.toHaveBeenCalled();
  });
});