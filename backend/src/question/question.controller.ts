import { Controller, Get, Post, Body, Param, Delete, Patch } from '@nestjs/common';
import { QuestionService } from './question.service';

@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  // GET ALL
  @Get()
  findAll() {
    return this.questionService.findAll();
  }

  // CREATE
  @Post()
  create(@Body() body) {
    return this.questionService.create(body);
  }

  // GET BY ASSESSMENT
  @Get(':assessment_id')
  findByAssessment(@Param('assessment_id') id: string) {
    return this.questionService.findByAssessment(Number(id));
  }

  // UPDATE
  @Patch(':id')
  update(@Param('id') id: string, @Body() body) {
    return this.questionService.update(Number(id), body);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.questionService.remove(Number(id));
  }
}