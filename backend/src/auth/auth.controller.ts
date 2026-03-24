import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordSimpleDto } from './dto/reset-password-simple.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles/roles.guard';
import { Roles } from './roles/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('reset-password-simple')
  resetPasswordSimple(@Body() dto: ResetPasswordSimpleDto) {
    return this.authService.resetPasswordSimple(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('invite-staff')
  inviteStaff(@Request() req: any, @Body() body: any) {
    // Generate a temporary JWT token for registration
    // For a real app, track this token in DB to invalidate after use.
    // For now, we issue a token with short expiry.
    return this.authService.generateInviteToken(req.user, body.role);
  }
}
