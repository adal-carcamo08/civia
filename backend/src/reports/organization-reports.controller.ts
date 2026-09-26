import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssignOrganizationReportDto } from './dto/assign-organization-report.dto';
import { UpdateOrganizationReportStatusDto } from './dto/update-organization-report-status.dto';
import { ReportsService } from './reports.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationReportsController {
  constructor(
    private readonly reportsService: ReportsService,
  ) {}

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

  @Get(':id/admin/reports')
  findAdminReports(
    @Param('id') organizationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reportsService.findAdminReports(
      organizationId,
      request.user.id,
    );
  }

  @Get(':id/admin/reports/:reportId')
  findAdminReport(
    @Param('id') organizationId: string,
    @Param('reportId') reportId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reportsService.findAdminReport(
      organizationId,
      reportId,
      request.user.id,
    );
  }

  @Patch(':id/admin/reports/:reportId/status')
  updateAdminReportStatus(
    @Param('id') organizationId: string,
    @Param('reportId') reportId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateOrganizationReportStatusDto,
  ) {
    return this.reportsService.updateOrganizationReportStatus(
      organizationId,
      reportId,
      request.user.id,
      dto,
    );
  }

  @Patch(':id/admin/reports/:reportId/assignment')
  assignAdminReport(
    @Param('id') organizationId: string,
    @Param('reportId') reportId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: AssignOrganizationReportDto,
  ) {
    return this.reportsService.assignOrganizationReport(
      organizationId,
      reportId,
      request.user.id,
      dto,
    );
  }

  @Get(
    ':id/admin/reports/:reportId/attachments/:attachmentId/file',
  )
  async getAdminAttachmentFile(
    @Param('id') organizationId: string,
    @Param('reportId') reportId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const file =
      await this.reportsService.getAdminAttachmentFile(
        organizationId,
        reportId,
        attachmentId,
        request.user.id,
      );

    return new StreamableFile(
      file.buffer,
      {
        type: file.mimeType,
      },
    );
  }
}