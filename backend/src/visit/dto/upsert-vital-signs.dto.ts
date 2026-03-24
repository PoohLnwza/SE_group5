import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpsertVitalSignsDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(500)
  weight_kg?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(300)
  height_cm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(400)
  bp_systolic?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  bp_diastolic?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  heart_rate?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
