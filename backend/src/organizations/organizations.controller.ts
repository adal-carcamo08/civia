import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';

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
  }}