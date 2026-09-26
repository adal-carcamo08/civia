import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const ORGANIZATION_REPORT_STATUS_VALUES = [
  'UNDER_REVIEW',
  'IN_PROGRESS',
  'RESOLVED',
  'NOT_APPLICABLE',
  'REJECTED',
] as const;

export type OrganizationReportStatus =
  (typeof ORGANIZATION_REPORT_STATUS_VALUES)[number];

export class UpdateOrganizationReportStatusDto {
  @IsString()
  @IsIn(ORGANIZATION_REPORT_STATUS_VALUES)
  status: OrganizationReportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}