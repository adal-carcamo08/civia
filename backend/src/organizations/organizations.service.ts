import { Injectable } from '@nestjs/common';
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
}