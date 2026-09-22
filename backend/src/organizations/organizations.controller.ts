import {
  Controller,
  Get,
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
}