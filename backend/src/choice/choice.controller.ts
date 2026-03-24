import { Controller, Post, Body, Get, Param, Delete, Patch } from '@nestjs/common';
import { ChoiceService } from './choice.service';

@Controller('choice')
export class ChoiceController {
  constructor(private readonly choiceService: ChoiceService) {}

  // CREATE
  @Post()
  create(@Body() body) {
    return this.choiceService.create(body);
  }

  // GET BY QUESTION
  @Get(':question_id')
  findByQuestion(@Param('question_id') id: string) {
    return this.choiceService.findByQuestion(Number(id));
  }

  // UPDATE
  @Patch(':id')
  update(@Param('id') id: string, @Body() body) {
    return this.choiceService.update(Number(id), body);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.choiceService.remove(Number(id));
  }
}