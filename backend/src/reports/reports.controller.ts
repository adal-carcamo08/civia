import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
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

  @Post(':id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_request, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Solo se permiten imágenes JPEG, PNG o WEBP.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  addAttachment(
    @Param('id') reportId: string,
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Debes adjuntar una imagen.',
      );
    }

    return this.reportsService.addAttachment(
      reportId,
      request.user.id,
      file,
    );
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
  }

  @Get(':reportId/attachments/:attachmentId/file')
  async getAttachmentFile(
    @Param('reportId') reportId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const file = await this.reportsService.getAttachmentFile(
      reportId,
      attachmentId,
      request.user.id,
    );

    return new StreamableFile(file.buffer, {
      type: file.mimeType,
    });
  }}