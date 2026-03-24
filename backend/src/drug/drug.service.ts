import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DrugService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.drug.findMany({
      orderBy: {
        drug_id: 'asc',
      },
    });
  }
}
