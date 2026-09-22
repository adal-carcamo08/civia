import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
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

    return memberships.map((membership) => ({
      ...membership.organization,
      membershipRole: membership.role,
      joinedAt: membership.joinedAt,
    }));
  }

  async findPublic(userId: string) {
    const organizations = await this.prisma.organization.findMany({
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
            userId,
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

    return organizations.map((organization) => {
      const membership = organization.memberships[0] ?? null;

      return {
        id: organization.id,
        name: organization.name,
        description: organization.description,
        logoUrl: organization.logoUrl,
        type: organization.type,
        isMember: membership?.status === 'ACTIVE',
        membershipRole: membership?.role ?? null,
        membershipStatus: membership?.status ?? null,
      };
    });
  }

  async findOneForUser(organizationId: string, userId: string) {
    const organization = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        active: true,
        OR: [
          {
            type: 'PUBLIC',
          },
          {
            memberships: {
              some: {
                userId,
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
            userId,
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

    if (!organization) {
      throw new NotFoundException('Organización no encontrada.');
    }

    const membership = organization.memberships[0] ?? null;

    return {
      id: organization.id,
      name: organization.name,
      description: organization.description,
      logoUrl: organization.logoUrl,
      type: organization.type,
      isMember: membership?.status === 'ACTIVE',
      membershipRole: membership?.role ?? null,
      membershipStatus: membership?.status ?? null,
      joinedAt: membership?.joinedAt ?? null,
    };
  }

  async joinPublic(organizationId: string, userId: string) {
    const organization = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        type: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organización no encontrada.');
    }

    if (organization.type !== 'PUBLIC') {
      throw new ForbiddenException(
        'Esta organización requiere invitación o autorización.',
      );
    }

    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (existingMembership) {
      throw new ConflictException(
        'Ya existe una membresía para esta organización.',
      );
    }

    const membership = await this.prisma.membership.create({
      data: {
        userId,
        organizationId,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
      select: {
        role: true,
        status: true,
        joinedAt: true,
      },
    });

    return {
      ...organization,
      isMember: true,
      membershipRole: membership.role,
      membershipStatus: membership.status,
      joinedAt: membership.joinedAt,
    };
  }
}