import { IsInt, Min } from 'class-validator';

export class UpsertPrescriptionItemDto {
  @IsInt()
  @Min(1)
  drug_id: number;

  @IsInt()
  @Min(1)
  quantity: number;
}
