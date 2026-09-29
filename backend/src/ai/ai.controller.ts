import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';
import { ReportSuggestionDto } from './dto/report-suggestion.dto';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
  ) {}

  @Post('report-suggestion')
  suggestReport(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ReportSuggestionDto,
  ) {
    return this.aiService.suggestReport(
      request.user.id,
      dto,
    );
  }
}
