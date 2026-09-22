jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  const membershipFindManyMock = jest.fn();
  const organizationFindManyMock = jest.fn();

  let service: OrganizationsService;

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = {
      membership: {
        findMany: membershipFindManyMock,
      },
      organization: {
        findMany: organizationFindManyMock,
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
});