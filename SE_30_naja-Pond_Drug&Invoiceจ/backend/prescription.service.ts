
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrescriptionService {
  constructor(private prisma: PrismaService) {}

  create(data: any) {
    return this.prisma.prescription.create({
      data: { visit_id: data.visit_id },
    });
  }

  addItem(data: any) {
    return this.prisma.prescription_item.create({
      data: {
        prescription_id: data.prescription_id,
        drug_id: data.drug_id,
        quantity: data.quantity,
      },
    });
  }

  getOne(id: number) {
    return this.prisma.prescription.findUnique({
      where: { prescription_id: id },
      include: {
        prescription_item: { include: { drug: true } },
      },
    });
  }
}
