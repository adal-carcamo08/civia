import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.create(request.user.id, dto);
  }

  @Get('mine')
  findMine(@Req() request: AuthenticatedRequest) {
    return this.reportsService.findMine(request.user.id);
  }
  @Get(':id')
  findOne(
    @Param('id') reportId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reportsService.findOneMine(
      reportId,
      request.user.id,
    );
  }}