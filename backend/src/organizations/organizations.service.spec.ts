jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  const findManyMock = jest.fn();

  let service: OrganizationsService;

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = {
      membership: {
        findMany: findManyMock,
      },
    };

    service = new OrganizationsService(prisma as never);
  });

  it('devuelve las organizaciones activas del usuario', async () => {
    const joinedAt = new Date('2026-09-22T16:47:38.594Z');

    findManyMock.mockResolvedValue([
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

    expect(findManyMock).toHaveBeenCalledWith({
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
    findManyMock.mockResolvedValue([]);

    const result = await service.findMine('user-1');

    expect(result).toEqual([]);
  });

  it('conserva el rol de membresía correspondiente a cada organización', async () => {
    const firstDate = new Date('2026-09-22T16:00:00.000Z');
    const secondDate = new Date('2026-09-21T16:00:00.000Z');

    findManyMock.mockResolvedValue([
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