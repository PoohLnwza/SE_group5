import { Controller, Get } from '@nestjs/common';
import { DrugService } from './drug.service';

@Controller('drug')
export class DrugController {
  constructor(private readonly drugService: DrugService) {}

  @Get()
  findAll() {
    return this.drugService.findAll();
  }
}
