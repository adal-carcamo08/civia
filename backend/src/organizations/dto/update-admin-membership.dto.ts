import {
  IsIn,
  IsOptional,
} from 'class-validator';

export class UpdateAdminMembershipDto {
  @IsOptional()
  @IsIn(['MEMBER', 'STAFF', 'ADMIN'])
  role?: 'MEMBER' | 'STAFF' | 'ADMIN';

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED';
}