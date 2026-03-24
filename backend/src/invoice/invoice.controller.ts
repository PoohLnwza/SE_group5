import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CreateInvoiceFromPrescriptionDto } from './dto/create-invoice-from-prescription.dto';
import { InvoiceService } from './invoice.service';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('from-prescription')
  createFromPrescription(@Body() dto: CreateInvoiceFromPrescriptionDto) {
    return this.invoiceService.createFromPrescription(dto.prescriptionId);
  }

  @Get('visit/:visitId')
  getByVisit(@Param('visitId', ParseIntPipe) visitId: number) {
    return this.invoiceService.getByVisit(visitId);
  }
}
