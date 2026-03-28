
import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { DrugService } from './drug.service';

@Controller('drug')
export class DrugController {
  constructor(private readonly drugService: DrugService) {}

  @Post()
  create(@Body() body: any) {
    return this.drugService.create(body);
  }

  @Get()
  findAll() {
    return this.drugService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.drugService.findOne(Number(id));
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.drugService.remove(Number(id));
  }
}
