import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';
import { AssignGlobalOrganizationAdminDto } from './dto/assign-global-organization-admin.dto';
import { CreateGlobalOrganizationDto } from './dto/create-global-organization.dto';
import { UpdateGlobalOrganizationDto } from './dto/update-global-organization.dto';
import { CreateAdminCategoryDto } from './dto/create-admin-category.dto';
import { CreateAdminDepartmentDto } from './dto/create-admin-department.dto';
import { CreateAdminInvitationDto } from './dto/create-admin-invitation.dto';
import { UpdateAdminCategoryDto } from './dto/update-admin-category.dto';
import { UpdateAdminDepartmentDto } from './dto/update-admin-department.dto';
import { UpdateAdminMembershipDto } from './dto/update-admin-membership.dto';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get()
  findMine(@Req() request: AuthenticatedRequest) {
    return this.organizationsService.findMine(request.user.id);
  }

  @Get('public')
  findPublic(@Req() request: AuthenticatedRequest) {
    return this.organizationsService.findPublic(request.user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') organizationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizationsService.findOneForUser(
      organizationId,
      request.user.id,
    );
  }

  @Post(':id/join')
  join(
    @Param('id') organizationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizationsService.joinPublic(
      organizationId,
      request.user.id,
    );
  }

  @Get(':id/categories')
  findCategories(
    @Param('id') organizationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizationsService.findCategoriesForUser(
      organizationId,
      request.user.id,
    );
  }
  @Get(':id/admin/context')
  findAdminContext(
    @Param('id') organizationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizationsService.findAdminContext(
      organizationId,
      request.user.id,
    );
  }

  @Get(':id/admin/management')
  findAdminManagement(
    @Param('id') organizationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizationsService.findAdminManagement(
      organizationId,
      request.user.id,
    );
  }

  @Post(':id/admin/departments')
  createAdminDepartment(
    @Param('id') organizationId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateAdminDepartmentDto,
  ) {
    return this.organizationsService.createAdminDepartment(
      organizationId,
      request.user.id,
      dto,
    );
  }

  @Patch(':id/admin/departments/:departmentId')
  updateAdminDepartment(
    @Param('id') organizationId: string,
    @Param('departmentId') departmentId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateAdminDepartmentDto,
  ) {
    return this.organizationsService.updateAdminDepartment(
      organizationId,
      departmentId,
      request.user.id,
      dto,
    );
  }

  @Post(':id/admin/categories')
  createAdminCategory(
    @Param('id') organizationId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateAdminCategoryDto,
  ) {
    return this.organizationsService.createAdminCategory(
      organizationId,
      request.user.id,
      dto,
    );
  }

  @Patch(':id/admin/categories/:categoryId')
  updateAdminCategory(
    @Param('id') organizationId: string,
    @Param('categoryId') categoryId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateAdminCategoryDto,
  ) {
    return this.organizationsService.updateAdminCategory(
      organizationId,
      categoryId,
      request.user.id,
      dto,
    );
  }

  @Patch(':id/admin/members/:membershipId')
  updateAdminMembership(
    @Param('id') organizationId: string,
    @Param('membershipId') membershipId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateAdminMembershipDto,
  ) {
    return this.organizationsService.updateAdminMembership(
      organizationId,
      membershipId,
      request.user.id,
      dto,
    );
  }

  @Post(':id/admin/invitations')
  createAdminInvitation(
    @Param('id') organizationId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateAdminInvitationDto,
  ) {
    return this.organizationsService.createAdminInvitation(
      organizationId,
      request.user.id,
      dto,
    );
  }

  @Post(':id/admin/invitations/:invitationId/revoke')
  revokeAdminInvitation(
    @Param('id') organizationId: string,
    @Param('invitationId') invitationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizationsService.revokeAdminInvitation(
      organizationId,
      invitationId,
      request.user.id,
    );
  }

  @Get('platform/admin/organizations')
  findGlobalAdminOrganizations(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizationsService.findGlobalAdminOrganizations(
      request.user.id,
    );
  }

  @Post('platform/admin/organizations')
  createGlobalOrganization(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateGlobalOrganizationDto,
  ) {
    return this.organizationsService.createGlobalOrganization(
      request.user.id,
      dto,
    );
  }

  @Patch('platform/admin/organizations/:organizationId')
  updateGlobalOrganization(
    @Param('organizationId') organizationId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateGlobalOrganizationDto,
  ) {
    return this.organizationsService.updateGlobalOrganization(
      request.user.id,
      organizationId,
      dto,
    );
  }

  @Post('platform/admin/organizations/:organizationId/admin')
  assignGlobalOrganizationAdmin(
    @Param('organizationId') organizationId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: AssignGlobalOrganizationAdminDto,
  ) {
    return this.organizationsService.assignGlobalOrganizationAdmin(
      request.user.id,
      organizationId,
      dto,
    );
  }
}