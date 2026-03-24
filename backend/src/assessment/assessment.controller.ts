import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('assessment')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Get('dashboard')
  getDashboard(@Request() req: any) {
    return this.assessmentService.getDashboard(req.user);
  }

  @Get('templates')
  getTemplates(@Request() req: any) {
    return this.assessmentService.getTemplates(req.user);
  }

  @Get('templates/:id')
  getTemplateById(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.assessmentService.getTemplateById(req.user, id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'doctor', 'psychologist')
  @Post('templates')
  createTemplate(@Request() req: any, @Body() body: any) {
    return this.assessmentService.createTemplate(req.user, body);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'doctor', 'psychologist')
  @Patch('templates/:id')
  updateTemplate(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.assessmentService.updateTemplate(req.user, id, body);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'doctor', 'psychologist')
  @Delete('templates/:id')
  deleteTemplate(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.assessmentService.deleteTemplate(req.user, id);
  }

  @Get('parent/context')
  getParentContext(@Request() req: any) {
    return this.assessmentService.getParentContext(req.user);
  }

  @Post('submit')
  submitAssessment(@Request() req: any, @Body() body: any) {
    return this.assessmentService.submitAssessment(req.user, body);
  }

  @Get('results')
  getResults(
    @Request() req: any,
    @Query('childId') childId?: string,
    @Query('assessmentId') assessmentId?: string,
  ) {
    return this.assessmentService.getResults(
      req.user,
      childId ? Number(childId) : undefined,
      assessmentId ? Number(assessmentId) : undefined,
    );
  }

  @Get('results/:id')
  getResultById(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.assessmentService.getResultById(req.user, id);
  }
}
