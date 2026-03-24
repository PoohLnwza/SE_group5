import { Module } from '@nestjs/common';
import { InvoiceModule } from '../invoice/invoice.module';
import { VisitService } from './visit.service';
import { VisitController } from './visit.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, InvoiceModule],
  providers: [VisitService],
  controllers: [VisitController],
})
export class VisitModule {}
