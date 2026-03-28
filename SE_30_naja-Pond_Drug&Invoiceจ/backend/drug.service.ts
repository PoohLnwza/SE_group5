
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DrugService {
  constructor(private prisma: PrismaService) {}

  create(data: any) {
    return this.prisma.drug.create({ data });
  }

  findAll() {
    return this.prisma.drug.findMany();
  }

  findOne(id: number) {
    return this.prisma.drug.findUnique({ where: { drug_id: id } });
  }

  remove(id: number) {
    return this.prisma.drug.delete({ where: { drug_id: id } });
  }
}
