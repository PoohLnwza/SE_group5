import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChoiceService {
  constructor(private prisma: PrismaService) {}

  // CREATE
  create(data: { question_id: number; choice_text: string; score: number }) {
    return this.prisma.choice.create({
      data,
    });
  }

  // GET BY QUESTION
  findByQuestion(question_id: number) {
    return this.prisma.choice.findMany({
      where: { question_id },
    });
  }

  // UPDATE
  update(choice_id: number, data: { choice_text?: string; score?: number }) {
    return this.prisma.choice.update({
      where: { choice_id },
      data,
    });
  }

  // DELETE
  remove(choice_id: number) {
    return this.prisma.choice.delete({
      where: { choice_id },
    });
  }
}