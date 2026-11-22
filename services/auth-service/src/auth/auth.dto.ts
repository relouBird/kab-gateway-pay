import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SUBJECT_TYPES, type SubjectType } from '@kgpay/contracts';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(32)
  phone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password!: string;

  @IsOptional()
  @IsIn(['en', 'fr'])
  locale?: 'en' | 'fr';
}

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password!: string;
}

export class VerifyOtpDto {
  @IsUUID()
  challengeId!: string;

  @IsString()
  @Length(6, 10)
  @Matches(/^\d+$/)
  code!: string;
}

export class ResendOtpDto {
  @IsUUID()
  challengeId!: string;

  @IsOptional()
  @IsIn(['en', 'fr'])
  locale?: 'en' | 'fr';
}

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsIn(['en', 'fr'])
  locale?: 'en' | 'fr';
}

export class ResetPasswordDto {
  @IsUUID()
  challengeId!: string;

  @IsString()
  @Length(6, 10)
  @Matches(/^\d+$/)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  newPassword!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  currentPassword!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  newPassword!: string;
}

export class RefreshDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  refreshToken?: string;
}

export class StepUpDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  action!: string;

  @IsOptional()
  @IsUUID()
  challengeId?: string;

  @IsOptional()
  @IsString()
  @Length(6, 10)
  @Matches(/^\d+$/)
  code?: string;

  @IsOptional()
  @IsIn(['en', 'fr'])
  locale?: 'en' | 'fr';
}

export class AcceptInvitationDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password!: string;
}

export class CreateStaffInvitationDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(32)
  phone!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  roles!: string[];
}

export class CreateCustomRoleDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9-]{1,39}$/)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  permissions!: string[];
}

export class AssignRoleDto {
  @IsString()
  @MaxLength(60)
  roleCode!: string;
}

export class IdentityListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @IsOptional()
  @IsString()
  @MaxLength(254)
  search?: string;

  @IsOptional()
  @IsIn(SUBJECT_TYPES)
  subjectType?: SubjectType;

  @IsOptional()
  @IsString()
  @IsIn([
    'PENDING_VERIFICATION',
    'PENDING_INVITATION',
    'ACTIVE',
    'SUSPENDED',
    'DISABLED',
  ])
  status?: string;
}

export class ServiceIntrospectionDto {
  @IsUUID()
  sessionId!: string;
}

export class UpdateEmailDto {
  @IsEmail()
  @MaxLength(254)
  newEmail!: string;

  @IsString()
  @Length(6, 10)
  @Matches(/^\d+$/)
  code!: string;

  @IsUUID()
  challengeId!: string;
}

export class NewEmailDto {
  @IsEmail()
  @MaxLength(254)
  newEmail!: string;
}

export class UpdatePhoneDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  phone!: string;
}

export class RequestEmailRecoveryDto extends NewEmailDto {}

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @IsOptional()
  @IsUUID()
  identityId?: string;
}
