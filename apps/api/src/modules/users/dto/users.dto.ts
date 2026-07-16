import { IsString, IsOptional, IsMobilePhone, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '../../../common/constants/roles.constant';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMobilePhone('en-IN')
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatar?: string;
}

export class UpdateUserRoleDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}

export class CreateAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @IsString() fullName: string;
  @IsString() phone: string;
  @IsString() line1: string;
  @IsOptional() @IsString() line2?: string;
  @IsString() city: string;
  @IsString() state: string;
  @IsString() pincode: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() landmark?: string;
  @IsOptional() isDefault?: boolean;
}

export class UpdateAddressDto extends CreateAddressDto {}
