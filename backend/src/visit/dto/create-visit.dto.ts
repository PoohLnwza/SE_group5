import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpsertPrescriptionItemDto } from './upsert-prescription-item.dto';
import { UpsertVitalSignsDto } from './upsert-vital-signs.dto';

export class CreateVisitDto {
  @IsInt()
  @Min(1)
  appointment_id: number;

  @IsOptional()
  @IsISO8601()
  visit_date?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpsertVitalSignsDto)
  vital_signs?: UpsertVitalSignsDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  diagnoses?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  treatment_plans?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => UpsertPrescriptionItemDto)
  prescriptions?: UpsertPrescriptionItemDto[];
}
