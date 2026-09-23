import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationReportsController } from './organization-reports.controller';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  controllers: [ReportsController, OrganizationReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}