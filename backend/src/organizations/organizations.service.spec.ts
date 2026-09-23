jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  const membershipFindManyMock = jest.fn();
  const membershipFindUniqueMock = jest.fn();
  const membershipCreateMock = jest.fn();
  const organizationFindManyMock = jest.fn();
  const organizationFindFirstMock = jest.fn();
  const categoryFindManyMock = jest.fn();

  let service: OrganizationsService;

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = {
      membership: {
        findMany: membershipFindManyMock,
        findUnique: membershipFindUniqueMock,
        create: membershipCreateMock,
      },
      organization: {
        findMany: organizationFindManyMock,
        findFirst: organizationFindFirstMock,
      },
      category: {
        findMany: categoryFindManyMock,
      },
    };

    service = new OrganizationsService(prisma as never);
  });

  describe('findMine', () => {
    it('devuelve las organizaciones activas del usuario', async () => {
      const joinedAt = new Date('2026-09-22T16:47:38.594Z');

      membershipFindManyMock.mockResolvedValue([
        {
          role: 'MEMBER',
          joinedAt,
          organization: {
            id: 'organization-1',
            name: 'Organización Demo CIVIA',
            description:
              'Organización pública utilizada para validar el funcionamiento de CIVIA.',
            logoUrl: null,
            type: 'PUBLIC',
          },
        },
      ]);

      const result = await service.findMine('user-1');

      expect(membershipFindManyMock).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: 'ACTIVE',
          organization: {
            active: true,
          },
        },
        select: {
          role: true,
          joinedAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              description: true,
              logoUrl: true,
              type: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'desc',
        },
      });

      expect(result).toEqual([
        {
          id: 'organization-1',
          name: 'Organización Demo CIVIA',
          description:
            'Organización pública utilizada para validar el funcionamiento de CIVIA.',
          logoUrl: null,
          type: 'PUBLIC',
          membershipRole: 'MEMBER',
          joinedAt,
        },
      ]);
    });

    it('devuelve un arreglo vacío cuando el usuario no tiene organizaciones', async () => {
      membershipFindManyMock.mockResolvedValue([]);

      const result = await service.findMine('user-1');

      expect(result).toEqual([]);
    });

    it('conserva el rol de membresía correspondiente a cada organización', async () => {
      const firstDate = new Date('2026-09-22T16:00:00.000Z');
      const secondDate = new Date('2026-09-21T16:00:00.000Z');

      membershipFindManyMock.mockResolvedValue([
        {
          role: 'ADMIN',
          joinedAt: firstDate,
          organization: {
            id: 'organization-1',
            name: 'Organización Uno',
            description: null,
            logoUrl: null,
            type: 'PRIVATE',
          },
        },
        {
          role: 'MEMBER',
          joinedAt: secondDate,
          organization: {
            id: 'organization-2',
            name: 'Organización Dos',
            description: null,
            logoUrl: null,
            type: 'PUBLIC',
          },
        },
      ]);

      const result = await service.findMine('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].membershipRole).toBe('ADMIN');
      expect(result[1].membershipRole).toBe('MEMBER');
    });
  });

  describe('findPublic', () => {
    it('devuelve organizaciones públicas activas y marca la membresía del usuario', async () => {
      organizationFindManyMock.mockResolvedValue([
        {
          id: 'organization-1',
          name: 'Organización Demo CIVIA',
          description: 'Organización pública de prueba.',
          logoUrl: null,
          type: 'PUBLIC',
          memberships: [
            {
              role: 'MEMBER',
              status: 'ACTIVE',
            },
          ],
        },
      ]);

      const result = await service.findPublic('user-1');

      expect(organizationFindManyMock).toHaveBeenCalledWith({
        where: {
          type: 'PUBLIC',
          active: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          logoUrl: true,
          type: true,
          memberships: {
            where: {
              userId: 'user-1',
            },
            select: {
              role: true,
              status: true,
            },
            take: 1,
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      expect(result).toEqual([
        {
          id: 'organization-1',
          name: 'Organización Demo CIVIA',
          description: 'Organización pública de prueba.',
          logoUrl: null,
          type: 'PUBLIC',
          isMember: true,
          membershipRole: 'MEMBER',
          membershipStatus: 'ACTIVE',
        },
      ]);
    });

    it('marca como no miembro una organización sin membresía', async () => {
      organizationFindManyMock.mockResolvedValue([
        {
          id: 'organization-2',
          name: 'Organización Pública Dos',
          description: null,
          logoUrl: null,
          type: 'PUBLIC',
          memberships: [],
        },
      ]);

      const result = await service.findPublic('user-1');

      expect(result).toEqual([
        {
          id: 'organization-2',
          name: 'Organización Pública Dos',
          description: null,
          logoUrl: null,
          type: 'PUBLIC',
          isMember: false,
          membershipRole: null,
          membershipStatus: null,
        },
      ]);
    });

    it('no considera miembro activo a una membresía pendiente', async () => {
      organizationFindManyMock.mockResolvedValue([
        {
          id: 'organization-3',
          name: 'Organización Pendiente',
          description: null,
          logoUrl: null,
          type: 'PUBLIC',
          memberships: [
            {
              role: 'MEMBER',
              status: 'PENDING',
            },
          ],
        },
      ]);

      const result = await service.findPublic('user-1');

      expect(result[0]).toEqual({
        id: 'organization-3',
        name: 'Organización Pendiente',
        description: null,
        logoUrl: null,
        type: 'PUBLIC',
        isMember: false,
        membershipRole: 'MEMBER',
        membershipStatus: 'PENDING',
      });
    });
  });

  describe('findOneForUser', () => {
    it('devuelve una organización pública donde el usuario es miembro', async () => {
      const joinedAt = new Date('2026-09-22T16:47:38.594Z');

      organizationFindFirstMock.mockResolvedValue({
        id: 'organization-1',
        name: 'Organización Demo CIVIA',
        description: 'Organización pública de prueba.',
        logoUrl: null,
        type: 'PUBLIC',
        memberships: [
          {
            role: 'MEMBER',
            status: 'ACTIVE',
            joinedAt,
          },
        ],
      });

      const result = await service.findOneForUser(
        'organization-1',
        'user-1',
      );

      expect(organizationFindFirstMock).toHaveBeenCalledWith({
        where: {
          id: 'organization-1',
          active: true,
          OR: [
            {
              type: 'PUBLIC',
            },
            {
              memberships: {
                some: {
                  userId: 'user-1',
                  status: 'ACTIVE',
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          logoUrl: true,
          type: true,
          memberships: {
            where: {
              userId: 'user-1',
            },
            select: {
              role: true,
              status: true,
              joinedAt: true,
            },
            take: 1,
          },
        },
      });

      expect(result).toEqual({
        id: 'organization-1',
        name: 'Organización Demo CIVIA',
        description: 'Organización pública de prueba.',
        logoUrl: null,
        type: 'PUBLIC',
        isMember: true,
        membershipRole: 'MEMBER',
        membershipStatus: 'ACTIVE',
        joinedAt,
      });
    });

    it('permite ver una organización pública sin membresía', async () => {
      organizationFindFirstMock.mockResolvedValue({
        id: 'organization-2',
        name: 'Organización Pública Dos',
        description: null,
        logoUrl: null,
        type: 'PUBLIC',
        memberships: [],
      });

      const result = await service.findOneForUser(
        'organization-2',
        'user-1',
      );

      expect(result).toEqual({
        id: 'organization-2',
        name: 'Organización Pública Dos',
        description: null,
        logoUrl: null,
        type: 'PUBLIC',
        isMember: false,
        membershipRole: null,
        membershipStatus: null,
        joinedAt: null,
      });
    });

    it('permite ver una organización privada con membresía activa', async () => {
      const joinedAt = new Date('2026-09-22T17:06:05.141Z');

      organizationFindFirstMock.mockResolvedValue({
        id: 'organization-private',
        name: 'Organización Privada CIVIA',
        description: 'Organización privada de prueba.',
        logoUrl: null,
        type: 'PRIVATE',
        memberships: [
          {
            role: 'MEMBER',
            status: 'ACTIVE',
            joinedAt,
          },
        ],
      });

      const result = await service.findOneForUser(
        'organization-private',
        'user-1',
      );

      expect(result.isMember).toBe(true);
      expect(result.membershipStatus).toBe('ACTIVE');
      expect(result.type).toBe('PRIVATE');
    });

    it('rechaza una organización inexistente o sin acceso', async () => {
      organizationFindFirstMock.mockResolvedValue(null);

      await expect(
        service.findOneForUser(
          'organization-private',
          'user-1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('joinPublic', () => {
    it('permite unirse a una organización pública activa', async () => {
      const joinedAt = new Date('2026-09-22T17:12:56.550Z');

      organizationFindFirstMock.mockResolvedValue({
        id: 'organization-public',
        name: 'Organización Pública Dos',
        description: 'Organización pública disponible para nuevos miembros.',
        logoUrl: null,
        type: 'PUBLIC',
      });

      membershipFindUniqueMock.mockResolvedValue(null);

      membershipCreateMock.mockResolvedValue({
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt,
      });

      const result = await service.joinPublic(
        'organization-public',
        'user-1',
      );

      expect(membershipFindUniqueMock).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: 'user-1',
            organizationId: 'organization-public',
          },
        },
        select: {
          id: true,
          role: true,
          status: true,
        },
      });

      expect(membershipCreateMock).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          organizationId: 'organization-public',
          role: 'MEMBER',
          status: 'ACTIVE',
        },
        select: {
          role: true,
          status: true,
          joinedAt: true,
        },
      });

      expect(result).toEqual({
        id: 'organization-public',
        name: 'Organización Pública Dos',
        description: 'Organización pública disponible para nuevos miembros.',
        logoUrl: null,
        type: 'PUBLIC',
        isMember: true,
        membershipRole: 'MEMBER',
        membershipStatus: 'ACTIVE',
        joinedAt,
      });
    });

    it('rechaza una membresía existente', async () => {
      organizationFindFirstMock.mockResolvedValue({
        id: 'organization-public',
        name: 'Organización Pública Dos',
        description: null,
        logoUrl: null,
        type: 'PUBLIC',
      });

      membershipFindUniqueMock.mockResolvedValue({
        id: 'membership-1',
        role: 'MEMBER',
        status: 'ACTIVE',
      });

      await expect(
        service.joinPublic('organization-public', 'user-1'),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(membershipCreateMock).not.toHaveBeenCalled();
    });

    it('rechaza el ingreso directo a una organización privada', async () => {
      organizationFindFirstMock.mockResolvedValue({
        id: 'organization-private',
        name: 'Organización Privada CIVIA',
        description: null,
        logoUrl: null,
        type: 'PRIVATE',
      });

      await expect(
        service.joinPublic('organization-private', 'user-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(membershipFindUniqueMock).not.toHaveBeenCalled();
      expect(membershipCreateMock).not.toHaveBeenCalled();
    });

    it('rechaza una organización inexistente o inactiva', async () => {
      organizationFindFirstMock.mockResolvedValue(null);

      await expect(
        service.joinPublic('organization-missing', 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(membershipFindUniqueMock).not.toHaveBeenCalled();
      expect(membershipCreateMock).not.toHaveBeenCalled();
    });
  });
  describe('findCategoriesForUser', () => {
    it('devuelve solo las categorías activas de una organización accesible', async () => {
      organizationFindFirstMock.mockResolvedValue({
        id: 'organization-1',
        name: 'Organización Demo CIVIA',
        description: null,
        logoUrl: null,
        type: 'PUBLIC',
        memberships: [
          {
            role: 'MEMBER',
            status: 'ACTIVE',
            joinedAt: new Date('2026-09-22T16:47:38.594Z'),
          },
        ],
      });

      categoryFindManyMock.mockResolvedValue([
        {
          id: 'category-1',
          name: 'Alumbrado público',
          description:
            'Reportes relacionados con iluminación y luminarias.',
          department: {
            id: 'department-1',
            name: 'Mantenimiento',
          },
        },
        {
          id: 'category-2',
          name: 'Fuga de agua',
          description:
            'Reportes relacionados con fugas o desperdicio de agua.',
          department: {
            id: 'department-1',
            name: 'Mantenimiento',
          },
        },
      ]);

      const result = await service.findCategoriesForUser(
        'organization-1',
        'user-1',
      );

      expect(categoryFindManyMock).toHaveBeenCalledWith({
        where: {
          organizationId: 'organization-1',
          active: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Alumbrado público');
      expect(result[1].name).toBe('Fuga de agua');
      expect(result[0].department).toEqual({
        id: 'department-1',
        name: 'Mantenimiento',
      });
    });

    it('devuelve un arreglo vacío cuando no existen categorías activas', async () => {
      organizationFindFirstMock.mockResolvedValue({
        id: 'organization-1',
        name: 'Organización Demo CIVIA',
        description: null,
        logoUrl: null,
        type: 'PUBLIC',
        memberships: [],
      });

      categoryFindManyMock.mockResolvedValue([]);

      const result = await service.findCategoriesForUser(
        'organization-1',
        'user-1',
      );

      expect(result).toEqual([]);
    });

    it('rechaza consultar categorías de una organización privada sin acceso', async () => {
      organizationFindFirstMock.mockResolvedValue(null);

      await expect(
        service.findCategoriesForUser(
          'organization-private',
          'user-1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(categoryFindManyMock).not.toHaveBeenCalled();
    });
  });});