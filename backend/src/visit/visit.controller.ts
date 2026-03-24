import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { VisitService } from './visit.service';

@UseGuards(JwtAuthGuard)
@Controller('visit')
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  @Get()
  getVisits(
    @Request() req: any,
    @Query('appointmentId') appointmentId?: string,
    @Query('patientId') patientId?: string,
    @Query('date') date?: string,
  ) {
    return this.visitService.getVisits(req.user, {
      appointmentId: appointmentId ? Number(appointmentId) : undefined,
      patientId: patientId ? Number(patientId) : undefined,
      date,
    });
  }

  @Get('appointment/:appointmentId')
  getByAppointment(
    @Request() req: any,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
  ) {
    return this.visitService.getVisitByAppointment(req.user, appointmentId);
  }

  @Get(':id')
  getById(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.visitService.getVisitById(req.user, id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'nurse', 'doctor', 'psychologist')
  @Post()
  createVisit(@Request() req: any, @Body() dto: CreateVisitDto) {
    return this.visitService.createVisit(req.user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'nurse', 'doctor', 'psychologist')
  @Patch(':id')
  updateVisit(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVisitDto,
  ) {
    return this.visitService.updateVisit(req.user, id, dto);
  }
}
