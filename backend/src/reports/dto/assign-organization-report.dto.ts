import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class AssignOrganizationReportDto {
  @IsUUID()
  departmentId: string;

  @IsUUID()
  assignedToUserId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}