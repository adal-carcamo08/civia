import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createHash,
  randomBytes,
} from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AssignGlobalOrganizationAdminDto } from './dto/assign-global-organization-admin.dto';
import { CreateGlobalOrganizationDto } from './dto/create-global-organization.dto';
import { UpdateGlobalOrganizationDto } from './dto/update-global-organization.dto';
import { CreateAdminCategoryDto } from './dto/create-admin-category.dto';
import { CreateAdminDepartmentDto } from './dto/create-admin-department.dto';
import { CreateAdminInvitationDto } from './dto/create-admin-invitation.dto';
import { UpdateAdminCategoryDto } from './dto/update-admin-category.dto';
import { UpdateAdminDepartmentDto } from './dto/update-admin-department.dto';
import { UpdateAdminMembershipDto } from './dto/update-admin-membership.dto';

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

  async findCategoriesForUser(
    organizationId: string,
    userId: string,
  ) {
    await this.findOneForUser(organizationId, userId);

    return this.prisma.category.findMany({
      where: {
        organizationId,
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
  }
  async findAdminContext(
    organizationId: string,
    userId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        active: true,
      },
    });

    if (!user || !user.active) {
      throw new ForbiddenException(
        'No tienes autorización para gestionar esta organización.',
      );
    }

    let accessRole:
      | 'STAFF'
      | 'ADMIN'
      | 'GLOBAL_ADMIN';

    if (user.role === 'GLOBAL_ADMIN') {
      accessRole = 'GLOBAL_ADMIN';
    } else {
      const membership =
        await this.prisma.membership.findFirst({
          where: {
            userId,
            organizationId,
            status: 'ACTIVE',
            role: {
              in: ['STAFF', 'ADMIN'],
            },
          },
          select: {
            role: true,
          },
        });

      if (!membership) {
        throw new ForbiddenException(
          'Solo el personal autorizado puede gestionar esta organización.',
        );
      }

      accessRole =
        membership.role === 'ADMIN'
          ? 'ADMIN'
          : 'STAFF';
    }

    const organization =
      await this.prisma.organization.findFirst({
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
      throw new NotFoundException(
        'Organización no encontrada.',
      );
    }

    const [departments, staffMemberships] =
      await Promise.all([
        this.prisma.department.findMany({
          where: {
            organizationId,
            active: true,
          },
          select: {
            id: true,
            name: true,
            description: true,
          },
          orderBy: {
            name: 'asc',
          },
        }),

        this.prisma.membership.findMany({
          where: {
            organizationId,
            status: 'ACTIVE',
            role: {
              in: ['STAFF', 'ADMIN'],
            },
            user: {
              active: true,
            },
          },
          select: {
            role: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        }),
      ]);

    return {
      organization,
      accessRole,
      departments,
      staff: staffMemberships.map(
        (membership) => ({
          ...membership.user,
          role: membership.role,
        }),
      ),
    };
  }

  private async requireOrganizationAdmin(
    organizationId: string,
    userId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        active: true,
      },
    });

    if (!user || !user.active) {
      throw new ForbiddenException(
        'No tienes autorización para administrar esta organización.',
      );
    }

    if (user.role === 'GLOBAL_ADMIN') {
      const organization =
        await this.prisma.organization.findFirst({
          where: {
            id: organizationId,
            active: true,
          },
          select: {
            id: true,
            type: true,
          },
        });

      if (!organization) {
        throw new NotFoundException(
          'Organización no encontrada.',
        );
      }

      return {
        role: 'GLOBAL_ADMIN' as const,
        organization,
      };
    }

    const membership =
      await this.prisma.membership.findFirst({
        where: {
          organizationId,
          userId,
          status: 'ACTIVE',
          role: 'ADMIN',
          organization: {
            active: true,
          },
        },
        select: {
          role: true,
          organization: {
            select: {
              id: true,
              type: true,
            },
          },
        },
      });

    if (!membership) {
      throw new ForbiddenException(
        'Solo un administrador de la organización puede realizar esta acción.',
      );
    }

    return {
      role: 'ADMIN' as const,
      organization:
        membership.organization,
    };
  }

  async findAdminManagement(
    organizationId: string,
    userId: string,
  ) {
    await this.requireOrganizationAdmin(
      organizationId,
      userId,
    );

    const organization =
      await this.prisma.organization.findFirst({
        where: {
          id: organizationId,
          active: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organización no encontrada.',
      );
    }

    const [
      departments,
      categories,
      memberships,
      invitations,
    ] = await Promise.all([
      this.prisma.department.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          active: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),

      this.prisma.category.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          active: true,
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
      }),

      this.prisma.membership.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
          role: true,
          status: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              active: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      }),

      this.prisma.invitation.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
          email: true,
          status: true,
          expiresAt: true,
          acceptedAt: true,
          revokedAt: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 30,
      }),
    ]);

    return {
      organization,
      departments,
      categories,
      memberships,
      invitations,
    };
  }

  async createAdminDepartment(
    organizationId: string,
    userId: string,
    dto: CreateAdminDepartmentDto,
  ) {
    await this.requireOrganizationAdmin(
      organizationId,
      userId,
    );

    const name = dto.name.trim();

    const existing =
      await this.prisma.department.findFirst({
        where: {
          organizationId,
          name,
        },
        select: {
          id: true,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Ya existe un departamento con ese nombre.',
      );
    }

    return this.prisma.department.create({
      data: {
        organizationId,
        name,
        description:
          dto.description?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
      },
    });
  }

  async updateAdminDepartment(
    organizationId: string,
    departmentId: string,
    userId: string,
    dto: UpdateAdminDepartmentDto,
  ) {
    await this.requireOrganizationAdmin(
      organizationId,
      userId,
    );

    const department =
      await this.prisma.department.findFirst({
        where: {
          id: departmentId,
          organizationId,
        },
        select: {
          id: true,
        },
      });

    if (!department) {
      throw new NotFoundException(
        'Departamento no encontrado.',
      );
    }

    return this.prisma.department.update({
      where: {
        id: department.id,
      },
      data: {
        ...(dto.name !== undefined
          ? {
              name: dto.name.trim(),
            }
          : {}),
        ...(dto.description !== undefined
          ? {
              description:
                dto.description.trim() ||
                null,
            }
          : {}),
        ...(dto.active !== undefined
          ? {
              active: dto.active,
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
      },
    });
  }

  async createAdminCategory(
    organizationId: string,
    userId: string,
    dto: CreateAdminCategoryDto,
  ) {
    await this.requireOrganizationAdmin(
      organizationId,
      userId,
    );

    const name = dto.name.trim();

    const existing =
      await this.prisma.category.findFirst({
        where: {
          organizationId,
          name,
        },
        select: {
          id: true,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Ya existe una categoría con ese nombre.',
      );
    }

    let departmentId:
      | string
      | null = null;

    if (dto.departmentId) {
      const department =
        await this.prisma.department.findFirst({
          where: {
            id: dto.departmentId,
            organizationId,
            active: true,
          },
          select: {
            id: true,
          },
        });

      if (!department) {
        throw new NotFoundException(
          'El departamento seleccionado no existe o no está activo.',
        );
      }

      departmentId = department.id;
    }

    return this.prisma.category.create({
      data: {
        organizationId,
        departmentId,
        name,
        description:
          dto.description?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async updateAdminCategory(
    organizationId: string,
    categoryId: string,
    userId: string,
    dto: UpdateAdminCategoryDto,
  ) {
    await this.requireOrganizationAdmin(
      organizationId,
      userId,
    );

    const category =
      await this.prisma.category.findFirst({
        where: {
          id: categoryId,
          organizationId,
        },
        select: {
          id: true,
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Categoría no encontrada.',
      );
    }

    let departmentId:
      | string
      | undefined;

    if (dto.departmentId !== undefined) {
      const department =
        await this.prisma.department.findFirst({
          where: {
            id: dto.departmentId,
            organizationId,
            active: true,
          },
          select: {
            id: true,
          },
        });

      if (!department) {
        throw new NotFoundException(
          'El departamento seleccionado no existe o no está activo.',
        );
      }

      departmentId = department.id;
    }

    return this.prisma.category.update({
      where: {
        id: category.id,
      },
      data: {
        ...(dto.name !== undefined
          ? {
              name: dto.name.trim(),
            }
          : {}),
        ...(dto.description !== undefined
          ? {
              description:
                dto.description.trim() ||
                null,
            }
          : {}),
        ...(departmentId !== undefined
          ? {
              departmentId,
            }
          : {}),
        ...(dto.active !== undefined
          ? {
              active: dto.active,
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async updateAdminMembership(
    organizationId: string,
    membershipId: string,
    userId: string,
    dto: UpdateAdminMembershipDto,
  ) {
    await this.requireOrganizationAdmin(
      organizationId,
      userId,
    );

    if (
      dto.role === undefined &&
      dto.status === undefined
    ) {
      throw new BadRequestException(
        'Debes indicar un rol o estado.',
      );
    }

    const membership =
      await this.prisma.membership.findFirst({
        where: {
          id: membershipId,
          organizationId,
        },
        select: {
          id: true,
          userId: true,
        },
      });

    if (!membership) {
      throw new NotFoundException(
        'Membresía no encontrada.',
      );
    }

    if (membership.userId === userId) {
      throw new BadRequestException(
        'No puedes modificar tu propia membresía desde este panel.',
      );
    }

    return this.prisma.membership.update({
      where: {
        id: membership.id,
      },
      data: {
        ...(dto.role !== undefined
          ? {
              role: dto.role,
            }
          : {}),
        ...(dto.status !== undefined
          ? {
              status: dto.status,
            }
          : {}),
      },
      select: {
        id: true,
        role: true,
        status: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async createAdminInvitation(
    organizationId: string,
    userId: string,
    dto: CreateAdminInvitationDto,
  ) {
    const access =
      await this.requireOrganizationAdmin(
        organizationId,
        userId,
      );

    if (
      access.organization.type !==
      'PRIVATE'
    ) {
      throw new BadRequestException(
        'Las invitaciones se utilizan únicamente en organizaciones privadas.',
      );
    }

    const email =
      dto.email.trim().toLowerCase();

    const existingMembership =
      await this.prisma.membership.findFirst({
        where: {
          organizationId,
          user: {
            email,
          },
        },
        select: {
          id: true,
        },
      });

    if (existingMembership) {
      throw new ConflictException(
        'Ese usuario ya pertenece a la organización.',
      );
    }

    const existingInvitation =
      await this.prisma.invitation.findFirst({
        where: {
          organizationId,
          email,
          status: 'PENDING',
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
        },
      });

    if (existingInvitation) {
      throw new ConflictException(
        'Ya existe una invitación pendiente para ese correo.',
      );
    }

    const token =
      `CIVIA-${randomBytes(8)
        .toString('hex')
        .toUpperCase()}`;

    const tokenHash =
      createHash('sha256')
        .update(token, 'utf8')
        .digest('hex');

    const expiresAt =
      new Date(
        Date.now() +
          48 * 60 * 60 * 1000,
      );

    const invitation =
      await this.prisma.invitation.create({
        data: {
          organizationId,
          email,
          tokenHash,
          expiresAt,
          createdByUserId: userId,
        },
        select: {
          id: true,
          email: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      });

    return {
      ...invitation,
      token,
    };
  }

  async revokeAdminInvitation(
    organizationId: string,
    invitationId: string,
    userId: string,
  ) {
    await this.requireOrganizationAdmin(
      organizationId,
      userId,
    );

    const result =
      await this.prisma.invitation.updateMany({
        where: {
          id: invitationId,
          organizationId,
          status: 'PENDING',
        },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      });

    if (result.count !== 1) {
      throw new NotFoundException(
        'La invitación no existe o ya no está pendiente.',
      );
    }

    return {
      id: invitationId,
      status: 'REVOKED',
    };
  }

  private async requireGlobalAdmin(
    userId: string,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          role: true,
          active: true,
        },
      });

    if (
      !user ||
      !user.active ||
      user.role !== 'GLOBAL_ADMIN'
    ) {
      throw new ForbiddenException(
        'Esta operación requiere permisos de administrador global.',
      );
    }

    return user;
  }

  async findGlobalAdminOrganizations(
    userId: string,
  ) {
    await this.requireGlobalAdmin(
      userId,
    );

    return this.prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        type: true,
        active: true,
        createdAt: true,
        memberships: {
          where: {
            role: 'ADMIN',
            status: 'ACTIVE',
          },
          select: {
            id: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        _count: {
          select: {
            memberships: true,
            reports: true,
            departments: true,
            categories: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async createGlobalOrganization(
    userId: string,
    dto: CreateGlobalOrganizationDto,
  ) {
    await this.requireGlobalAdmin(
      userId,
    );

    const name = dto.name.trim();

    const existingOrganization =
      await this.prisma.organization.findFirst({
        where: {
          name,
        },
        select: {
          id: true,
        },
      });

    if (existingOrganization) {
      throw new ConflictException(
        'Ya existe una organización con ese nombre.',
      );
    }

    const adminEmail =
      dto.initialAdminEmail
        .trim()
        .toLowerCase();

    const initialAdmin =
      await this.prisma.user.findUnique({
        where: {
          email: adminEmail,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          active: true,
        },
      });

    if (
      !initialAdmin ||
      !initialAdmin.active
    ) {
      throw new NotFoundException(
        'El administrador inicial debe ser un usuario activo registrado en CIVIA.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const organization =
          await tx.organization.create({
            data: {
              name,
              description:
                dto.description?.trim() ||
                null,
              type: dto.type,
              active: true,
            },
            select: {
              id: true,
              name: true,
              description: true,
              type: true,
              active: true,
              createdAt: true,
            },
          });

        await tx.membership.upsert({
          where: {
            userId_organizationId: {
              userId:
                initialAdmin.id,
              organizationId:
                organization.id,
            },
          },
          update: {
            role: 'ADMIN',
            status: 'ACTIVE',
          },
          create: {
            userId:
              initialAdmin.id,
            organizationId:
              organization.id,
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        });

        await tx.category.create({
          data: {
            organizationId:
              organization.id,
            departmentId: null,
            name:
              'Otro / No estoy seguro',
            description:
              'Categoría genérica para reportes que todavía no pueden clasificarse con precisión.',
            active: true,
          },
        });

        return {
          ...organization,
          initialAdmin: {
            id: initialAdmin.id,
            fullName:
              initialAdmin.fullName,
            email:
              initialAdmin.email,
          },
        };
      },
    );
  }

  async updateGlobalOrganization(
    userId: string,
    organizationId: string,
    dto: UpdateGlobalOrganizationDto,
  ) {
    await this.requireGlobalAdmin(
      userId,
    );

    const organization =
      await this.prisma.organization.findFirst({
        where: {
          id: organizationId,
        },
        select: {
          id: true,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organización no encontrada.',
      );
    }

    if (
      dto.name === undefined &&
      dto.description === undefined &&
      dto.type === undefined &&
      dto.active === undefined
    ) {
      throw new BadRequestException(
        'Debes indicar al menos un cambio.',
      );
    }

    return this.prisma.organization.update({
      where: {
        id: organization.id,
      },
      data: {
        ...(dto.name !== undefined
          ? {
              name: dto.name.trim(),
            }
          : {}),
        ...(dto.description !== undefined
          ? {
              description:
                dto.description.trim() ||
                null,
            }
          : {}),
        ...(dto.type !== undefined
          ? {
              type: dto.type,
            }
          : {}),
        ...(dto.active !== undefined
          ? {
              active: dto.active,
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        active: true,
        updatedAt: true,
      },
    });
  }

  async assignGlobalOrganizationAdmin(
    userId: string,
    organizationId: string,
    dto: AssignGlobalOrganizationAdminDto,
  ) {
    await this.requireGlobalAdmin(
      userId,
    );

    const organization =
      await this.prisma.organization.findFirst({
        where: {
          id: organizationId,
        },
        select: {
          id: true,
          name: true,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organización no encontrada.',
      );
    }

    const email =
      dto.email.trim().toLowerCase();

    const targetUser =
      await this.prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          active: true,
        },
      });

    if (
      !targetUser ||
      !targetUser.active
    ) {
      throw new NotFoundException(
        'El administrador debe ser un usuario activo registrado en CIVIA.',
      );
    }

    await this.prisma.membership.upsert({
      where: {
        userId_organizationId: {
          userId:
            targetUser.id,
          organizationId:
            organization.id,
        },
      },
      update: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      create: {
        userId:
          targetUser.id,
        organizationId:
          organization.id,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    return {
      organization: {
        id: organization.id,
        name: organization.name,
      },
      administrator: {
        id: targetUser.id,
        fullName:
          targetUser.fullName,
        email:
          targetUser.email,
      },
    };
  }
}