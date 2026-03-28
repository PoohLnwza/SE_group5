
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.invoice.create({
      data: { visit_id: data.visit_id },
    });
  }

  async addItem(data: any) {
    return this.prisma.invoice_item.create({
      data: {
        invoice_id: data.invoice_id,
        item_type: data.item_type,
        description: data.description,
        qty: data.qty,
        unit_price: data.unit_price,
      },
    });
  }

  async getOne(id: number) {
    return this.prisma.invoice.findUnique({
      where: { invoice_id: id },
      include: { invoice_item: true },
    });
  }
}
