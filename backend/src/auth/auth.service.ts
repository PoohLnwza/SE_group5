import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {

    let invitedRole = 'admin'; // หรือเปลี่ยนเป็น 'nurse' ตามที่ต้องการให้เป็นค่าเริ่มต้น
    
    if (dto.userType === 'staff') {
      // --- เริ่มคอมเมนต์ส่วนนี้ ---
      /* if (!dto.inviteToken) {
        throw new UnauthorizedException('An invite token is required to register as staff');
      }
      try {
        const payload = this.jwtService.verify(dto.inviteToken);
        if (payload.purpose !== 'staff-invite') {
          throw new UnauthorizedException('Invalid token purpose');
        }
        invitedRole = payload.role || 'nurse'; 
      } catch (err) {
        throw new UnauthorizedException('Invalid or expired invite token');
      }
      */
      // --- จบคอมเมนต์ ---

      // เพิ่มบรรทัดนี้เพื่อกำหนด Role เริ่มต้นให้เจ้าหน้าที่ที่สมัครแบบไม่มี Token
      invitedRole = 'nurse'; 
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

    if (dto.userType === 'staff') {
      try {
        // Find existing role or create it
        let role = await this.prisma.roles.findUnique({
          where: { role_name: invitedRole },
        });
        if (!role) {
          role = await this.prisma.roles.create({
            data: { role_name: invitedRole },
          });
        }
        
        await this.prisma.staff.create({
          data: {
            first_name: 'New',
            last_name: 'Staff',
            role: invitedRole as any,
            status: 'active',
            user_id: user.user_id,
          },
        });

        await this.prisma.user_roles.create({
          data: {
            user_id: user.user_id,
            role_id: role.role_id,
          },
        });
      } catch (staffErr) {
        console.error('Error creating staff relations:', staffErr);
      }
    }

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


  async validateUserById(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        username: true,
        user_type: true,
        is_active: true,
        staff: true,
      },
    });
    if (!user || !user.is_active) return null;

    const staffRole = user.staff && user.staff.length > 0 ? user.staff[0].role : null;
    return { ...user, staffRole };
  }
}
