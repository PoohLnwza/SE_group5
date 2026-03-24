import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('admin/staff-management')
  getAdminStaffManagement() {
    return this.usersService.getAdminStaffManagement();
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch('admin/:userId/assign-role')
  assignStaffRole(
    @Request() req: any,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { roleName: string },
  ) {
    return this.usersService.assignStaffRole(req.user, userId, body.roleName);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'nurse', 'doctor', 'psychologist')
  @Get('staff/dashboard/common')
  getStaffCommonDashboard(@Request() req: any) {
    return this.usersService.getStaffCommonDashboard(req.user);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'nurse', 'doctor', 'psychologist')
  @Post('staff/create-user')
  createUser(@Request() req: any, @Body() body: CreateUserDto) {
    return this.usersService.createUserByStaff(req.user, body);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'nurse', 'doctor', 'psychologist')
  @Get('staff/dashboard/:roleName')
  getStaffRoleDashboard(
    @Request() req: any,
    @Param('roleName') roleName: string,
  ) {
    return this.usersService.getStaffRoleDashboard(req.user, roleName);
  }
}
