import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordSimpleDto } from './dto/reset-password-simple.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.userType !== 'parent') {
      throw new BadRequestException(
        'Self-registration is only available for parent accounts',
      );
    }

    const existing = await this.prisma.users.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.users.create({
      data: {
        username: dto.username,
        password_hash: passwordHash,
        user_type: dto.userType as any,
      },
    });

    const parentRole = await this.ensureRole('parent');

    await this.prisma.parent.create({
      data: {
        first_name: 'New',
        last_name: 'Parent',
        phone: '',
        user_id: user.user_id,
      },
    });

    await this.prisma.user_roles.create({
      data: {
        user_id: user.user_id,
        role_id: parentRole.role_id,
      },
    });

    const payload = {
      sub: user.user_id,
      username: user.username,
      userType: user.user_type,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  generateInviteToken(adminUser: any, targetRole: string = 'nurse') {
    const payload = {
      purpose: 'staff-invite',
      issuedBy: adminUser.userId,
      role: targetRole,
    };
    return {
      inviteToken: this.jwtService.sign(payload, { expiresIn: '24h' }),
    };
  }

  async login(dto: LoginDto) {
    // Find user
    const user = await this.prisma.users.findUnique({
      where: { username: dto.username },
    });
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare password
    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last_login_at
    await this.prisma.users.update({
      where: { user_id: user.user_id },
      data: { last_login_at: new Date() },
    });

    // Return JWT
    const payload = {
      sub: user.user_id,
      username: user.username,
      userType: user.user_type,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async resetPasswordSimple(dto: ResetPasswordSimpleDto) {
    const user = await this.prisma.users.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      throw new UnauthorizedException('Username not found');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.users.update({
      where: { user_id: user.user_id },
      data: {
        password_hash: passwordHash,
      },
    });

    return {
      message: 'Password updated successfully',
      username: user.username,
    };
  }

  async validateUserById(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        username: true,
        user_type: true,
        is_active: true,
        staff: true,
        user_roles: {
          include: {
            roles: {
              select: {
                role_name: true,
              },
            },
          },
        },
      },
    });
    if (!user || !user.is_active) return null;

    const staffRole =
      user.staff && user.staff.length > 0
        ? this.toPublicRoleName(user.staff[0].role)
        : null;
    const roleNames = user.user_roles.map((item) =>
      this.toPublicRoleName(item.roles.role_name),
    );
    return { ...user, staffRole, roleNames };
  }

  private async ensureRole(roleName: string) {
    return this.prisma.roles.upsert({
      where: { role_name: roleName },
      update: {},
      create: { role_name: roleName },
    });
  }

  private toPublicRoleName(roleName?: string | null) {
    if (!roleName) {
      return null;
    }

    return roleName === 'psychiatrist' ? 'doctor' : roleName;
  }
}
