import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionService {
  constructor(private prisma: PrismaService) {}

  // GET ALL
  findAll() {
    return this.prisma.question.findMany({
      include: { choice: true },
    });
  }

  // CREATE
  create(data: { assessment_id: number; question_text: string }) {
    return this.prisma.question.create({
      data,
    });
  }

  // GET BY ASSESSMENT
  findByAssessment(assessment_id: number) {
    return this.prisma.question.findMany({
      where: { assessment_id },
      include: { choice: true },
    });
  }

  // UPDATE
  update(question_id: number, data: { question_text?: string }) {
    return this.prisma.question.update({
      where: { question_id },
      data,
    });
  }

  // DELETE
  remove(question_id: number) {
    return this.prisma.question.delete({
      where: { question_id },
    });
  }
}