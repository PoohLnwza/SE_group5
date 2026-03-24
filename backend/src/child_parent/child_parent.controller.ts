import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChildParentService } from './child_parent.service';

@UseGuards(JwtAuthGuard)
@Controller('child-parent')
export class ChildParentController {
  constructor(private readonly childParentService: ChildParentService) {}

  @Get('context')
  getLinkContext(@Request() req: any) {
    return this.childParentService.getLinkContext(req.user);
  }

  @Get()
  getLinks(@Request() req: any) {
    return this.childParentService.getLinks(req.user);
  }

  @Post()
  linkChildToParent(
    @Request() req: any,
    @Body() body: { child_id: number; parent_id?: number },
  ) {
    return this.childParentService.linkChildToParent(req.user, body);
  }

  @Delete(':childId')
  unlinkChildFromParent(
    @Request() req: any,
    @Param('childId', ParseIntPipe) childId: number,
    @Query('parentId') parentId?: string,
  ) {
    return this.childParentService.unlinkChildFromParent(
      req.user,
      childId,
      parentId ? Number(parentId) : undefined,
    );
  }
}
