import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async accept(
    userId: string,
    userEmail: string,
    dto: AcceptInvitationDto,
  ) {
    const token = dto.token.trim();

    const tokenHash = createHash('sha256')
      .update(token, 'utf8')
      .digest('hex');

    const invitation = await this.prisma.invitation.findUnique({
      where: {
        tokenHash,
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

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada.');
    }

    if (invitation.status !== 'PENDING') {
      throw new ConflictException(
        'La invitación ya no está disponible.',
      );
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('La invitación ha expirado.');
    }

    if (!invitation.organization.active) {
      throw new NotFoundException('Organización no encontrada.');
    }

    if (
      invitation.email.trim().toLowerCase() !==
      userEmail.trim().toLowerCase()
    ) {
      throw new ForbiddenException(
        'Esta invitación pertenece a otro usuario.',
      );
    }

    const existingMembership =
      await this.prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: invitation.organizationId,
          },
        },
        select: {
          id: true,
        },
      });

    if (existingMembership) {
      throw new ConflictException(
        'Ya existe una membresía para esta organización.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          userId,
          organizationId: invitation.organizationId,
          role: 'MEMBER',
          status: 'ACTIVE',
        },
        select: {
          role: true,
          status: true,
          joinedAt: true,
        },
      });

      const accepted = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          status: 'PENDING',
        },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedByUserId: userId,
        },
      });

      if (accepted.count !== 1) {
        throw new ConflictException(
          'La invitación ya no está disponible.',
        );
      }

      return {
        ...invitation.organization,
        isMember: true,
        membershipRole: membership.role,
        membershipStatus: membership.status,
        joinedAt: membership.joinedAt,
      };
    });
  }
}