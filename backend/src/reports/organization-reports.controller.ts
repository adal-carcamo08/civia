import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':id/reports')
  findByOrganization(
    @Param('id') organizationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reportsService.findByOrganization(
      organizationId,
      request.user.id,
    );
  }
}