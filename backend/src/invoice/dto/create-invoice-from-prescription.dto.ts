import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateInvoiceFromPrescriptionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  prescriptionId: number;
}
