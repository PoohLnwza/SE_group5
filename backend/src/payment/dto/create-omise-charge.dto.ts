import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateOmiseChargeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  invoiceId: number;
}
