jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

describe(
  'OrganizationsService - administrador global',
  () => {
    const userFindUniqueMock = jest.fn();

    const organizationFindManyMock =
      jest.fn();

    const organizationFindFirstMock =
      jest.fn();

    const organizationCreateMock =
      jest.fn();

    const organizationUpdateMock =
      jest.fn();

    const membershipUpsertMock =
      jest.fn();

    const categoryCreateMock =
      jest.fn();

    const transactionMock =
      jest.fn();

    let service: OrganizationsService;

    beforeEach(() => {
      jest.clearAllMocks();

      const tx = {
        organization: {
          create:
            organizationCreateMock,
        },
        membership: {
          upsert:
            membershipUpsertMock,
        },
        category: {
          create:
            categoryCreateMock,
        },
      };

      transactionMock.mockImplementation(
        async (
          callback: (
            transaction: typeof tx,
          ) => unknown,
        ) => callback(tx),
      );

      const prisma = {
        user: {
          findUnique:
            userFindUniqueMock,
        },
        organization: {
          findMany:
            organizationFindManyMock,
          findFirst:
            organizationFindFirstMock,
          update:
            organizationUpdateMock,
        },
        membership: {
          upsert:
            membershipUpsertMock,
        },
        $transaction:
          transactionMock,
      };

      service =
        new OrganizationsService(
          prisma as never,
        );
    });

    it('rechaza acceso global a un usuario normal', async () => {
      userFindUniqueMock.mockResolvedValue({
        id: 'user-1',
        role: 'USER',
        active: true,
      });

      await expect(
        service.findGlobalAdminOrganizations(
          'user-1',
        ),
      ).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(
        organizationFindManyMock,
      ).not.toHaveBeenCalled();
    });

    it('permite al GLOBAL_ADMIN listar todas las organizaciones', async () => {
      userFindUniqueMock.mockResolvedValue({
        id: 'global-1',
        role: 'GLOBAL_ADMIN',
        active: true,
      });

      organizationFindManyMock.mockResolvedValue([
        {
          id: 'organization-1',
          name: 'Organización Uno',
          type: 'PUBLIC',
          active: true,
        },
      ]);

      const result =
        await service.findGlobalAdminOrganizations(
          'global-1',
        );

      expect(result).toHaveLength(1);

      expect(
        organizationFindManyMock,
      ).toHaveBeenCalled();
    });

    it('crea una organización, asigna administrador y crea categoría genérica', async () => {
      userFindUniqueMock
        .mockResolvedValueOnce({
          id: 'global-1',
          role: 'GLOBAL_ADMIN',
          active: true,
        })
        .mockResolvedValueOnce({
          id: 'admin-1',
          fullName:
            'Administrador Inicial',
          email:
            'admin@civia.com',
          active: true,
        });

      organizationFindFirstMock.mockResolvedValue(
        null,
      );

      organizationCreateMock.mockResolvedValue({
        id: 'organization-new',
        name: 'Nueva Organización',
        description:
          'Organización de prueba',
        type: 'PRIVATE',
        active: true,
        createdAt: new Date(),
      });

      membershipUpsertMock.mockResolvedValue({
        id: 'membership-admin',
      });

      categoryCreateMock.mockResolvedValue({
        id: 'category-generic',
      });

      const result =
        await service.createGlobalOrganization(
          'global-1',
          {
            name:
              'Nueva Organización',
            description:
              'Organización de prueba',
            type: 'PRIVATE',
            initialAdminEmail:
              'admin@civia.com',
          },
        );

      expect(result.id).toBe(
        'organization-new',
      );

      expect(
        membershipUpsertMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          create:
            expect.objectContaining({
              role: 'ADMIN',
              status: 'ACTIVE',
            }),
        }),
      );

      expect(
        categoryCreateMock,
      ).toHaveBeenCalledWith({
        data: {
          organizationId:
            'organization-new',
          departmentId: null,
          name:
            'Otro / No estoy seguro',
          description:
            'Categoría genérica para reportes que todavía no pueden clasificarse con precisión.',
          active: true,
        },
      });
    });

    it('rechaza asignar como administrador a un usuario inexistente', async () => {
      userFindUniqueMock
        .mockResolvedValueOnce({
          id: 'global-1',
          role: 'GLOBAL_ADMIN',
          active: true,
        })
        .mockResolvedValueOnce(null);

      organizationFindFirstMock.mockResolvedValue({
        id: 'organization-1',
        name:
          'Organización Uno',
      });

      await expect(
        service.assignGlobalOrganizationAdmin(
          'global-1',
          'organization-1',
          {
            email:
              'noexiste@civia.com',
          },
        ),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  },
);