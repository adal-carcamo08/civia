jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';

describe('InvitationsService', () => {
  const invitationFindUniqueMock = jest.fn();
  const membershipFindUniqueMock = jest.fn();
  const membershipCreateMock = jest.fn();
  const invitationUpdateManyMock = jest.fn();
  const transactionMock = jest.fn();

  let service: InvitationsService;

  beforeEach(() => {
    jest.clearAllMocks();

    const tx = {
      membership: {
        create: membershipCreateMock,
      },
      invitation: {
        updateMany: invitationUpdateManyMock,
      },
    };

    transactionMock.mockImplementation(
      async (callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
    );

    const prisma = {
      invitation: {
        findUnique: invitationFindUniqueMock,
      },
      membership: {
        findUnique: membershipFindUniqueMock,
      },
      $transaction: transactionMock,
    };

    service = new InvitationsService(prisma as never);
  });

  it('acepta una invitación válida y crea una membresía activa', async () => {
    const joinedAt = new Date('2026-09-23T16:30:17.125Z');

    invitationFindUniqueMock.mockResolvedValue({
      id: 'invitation-1',
      email: 'segundo@civia.com',
      status: 'PENDING',
      expiresAt: new Date('2099-09-24T16:29:27.027Z'),
      organizationId: 'organization-private',
      organization: {
        id: 'organization-private',
        name: 'Organización Privada Sin Acceso',
        description:
          'Organización privada para validar acceso a categorías.',
        logoUrl: null,
        type: 'PRIVATE',
        active: true,
      },
    });

    membershipFindUniqueMock.mockResolvedValue(null);

    membershipCreateMock.mockResolvedValue({
      role: 'MEMBER',
      status: 'ACTIVE',
      joinedAt,
    });

    invitationUpdateManyMock.mockResolvedValue({
      count: 1,
    });

    const result = await service.accept(
      'user-2',
      'segundo@civia.com',
      {
        token: 'CIVIA-PRIVADA-2026-SEGUNDO',
      },
    );

    expect(invitationFindUniqueMock).toHaveBeenCalledWith({
      where: {
        tokenHash:
          '977bdb7d134961b57632ebcb0581d9cc8b615330a3f0ac4bc881b37666a79e07',
      },
      select: {
        id: true,
        email: true,
        status: true,
        expiresAt: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
            logoUrl: true,
            type: true,
            active: true,
          },
        },
      },
    });

    expect(membershipFindUniqueMock).toHaveBeenCalledWith({
      where: {
        userId_organizationId: {
          userId: 'user-2',
          organizationId: 'organization-private',
        },
      },
      select: {
        id: true,
      },
    });

    expect(membershipCreateMock).toHaveBeenCalledWith({
      data: {
        userId: 'user-2',
        organizationId: 'organization-private',
        role: 'MEMBER',
        status: 'ACTIVE',
      },
      select: {
        role: true,
        status: true,
        joinedAt: true,
      },
    });

    expect(invitationUpdateManyMock).toHaveBeenCalledWith({
      where: {
        id: 'invitation-1',
        status: 'PENDING',
      },
      data: {
        status: 'ACCEPTED',
        acceptedAt: expect.any(Date),
        acceptedByUserId: 'user-2',
      },
    });

    expect(result).toEqual({
      id: 'organization-private',
      name: 'Organización Privada Sin Acceso',
      description:
        'Organización privada para validar acceso a categorías.',
      logoUrl: null,
      type: 'PRIVATE',
      active: true,
      isMember: true,
      membershipRole: 'MEMBER',
      membershipStatus: 'ACTIVE',
      joinedAt,
    });
  });

  it('rechaza un token inexistente', async () => {
    invitationFindUniqueMock.mockResolvedValue(null);

    await expect(
      service.accept(
        'user-2',
        'segundo@civia.com',
        {
          token: 'TOKEN-INEXISTENTE',
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(membershipFindUniqueMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rechaza una invitación que ya fue utilizada', async () => {
    invitationFindUniqueMock.mockResolvedValue({
      id: 'invitation-1',
      email: 'segundo@civia.com',
      status: 'ACCEPTED',
      expiresAt: new Date('2099-09-24T16:29:27.027Z'),
      organizationId: 'organization-private',
      organization: {
        id: 'organization-private',
        name: 'Organización Privada',
        description: null,
        logoUrl: null,
        type: 'PRIVATE',
        active: true,
      },
    });

    await expect(
      service.accept(
        'user-2',
        'segundo@civia.com',
        {
          token: 'CIVIA-PRIVADA-2026-SEGUNDO',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rechaza una invitación expirada', async () => {
    invitationFindUniqueMock.mockResolvedValue({
      id: 'invitation-1',
      email: 'segundo@civia.com',
      status: 'PENDING',
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
      organizationId: 'organization-private',
      organization: {
        id: 'organization-private',
        name: 'Organización Privada',
        description: null,
        logoUrl: null,
        type: 'PRIVATE',
        active: true,
      },
    });

    await expect(
      service.accept(
        'user-2',
        'segundo@civia.com',
        {
          token: 'CIVIA-PRIVADA-2026-SEGUNDO',
        },
      ),
    ).rejects.toBeInstanceOf(GoneException);

    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rechaza una invitación destinada a otro correo', async () => {
    invitationFindUniqueMock.mockResolvedValue({
      id: 'invitation-1',
      email: 'otra@civia.com',
      status: 'PENDING',
      expiresAt: new Date('2099-09-24T16:29:27.027Z'),
      organizationId: 'organization-private',
      organization: {
        id: 'organization-private',
        name: 'Organización Privada',
        description: null,
        logoUrl: null,
        type: 'PRIVATE',
        active: true,
      },
    });

    await expect(
      service.accept(
        'user-2',
        'segundo@civia.com',
        {
          token: 'CIVIA-PRIVADA-2026-SEGUNDO',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(membershipFindUniqueMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rechaza una invitación si ya existe membresía', async () => {
    invitationFindUniqueMock.mockResolvedValue({
      id: 'invitation-1',
      email: 'segundo@civia.com',
      status: 'PENDING',
      expiresAt: new Date('2099-09-24T16:29:27.027Z'),
      organizationId: 'organization-private',
      organization: {
        id: 'organization-private',
        name: 'Organización Privada',
        description: null,
        logoUrl: null,
        type: 'PRIVATE',
        active: true,
      },
    });

    membershipFindUniqueMock.mockResolvedValue({
      id: 'membership-1',
    });

    await expect(
      service.accept(
        'user-2',
        'segundo@civia.com',
        {
          token: 'CIVIA-PRIVADA-2026-SEGUNDO',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('detecta si otra solicitud consume la invitación durante la transacción', async () => {
    invitationFindUniqueMock.mockResolvedValue({
      id: 'invitation-1',
      email: 'segundo@civia.com',
      status: 'PENDING',
      expiresAt: new Date('2099-09-24T16:29:27.027Z'),
      organizationId: 'organization-private',
      organization: {
        id: 'organization-private',
        name: 'Organización Privada',
        description: null,
        logoUrl: null,
        type: 'PRIVATE',
        active: true,
      },
    });

    membershipFindUniqueMock.mockResolvedValue(null);

    membershipCreateMock.mockResolvedValue({
      role: 'MEMBER',
      status: 'ACTIVE',
      joinedAt: new Date(),
    });

    invitationUpdateManyMock.mockResolvedValue({
      count: 0,
    });

    await expect(
      service.accept(
        'user-2',
        'segundo@civia.com',
        {
          token: 'CIVIA-PRIVADA-2026-SEGUNDO',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});