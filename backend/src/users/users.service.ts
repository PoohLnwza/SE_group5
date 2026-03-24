import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminStaffManagement() {
    const [users, roles] = await Promise.all([
      this.prisma.users.findMany({
        include: {
          staff: true,
          parent: true,
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
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.roles.findMany({
        orderBy: { role_name: 'asc' },
      }),
    ]);

    return {
      users: users.map((user) => ({
        user_id: user.user_id,
        username: user.username,
        user_type: user.user_type,
        is_active: user.is_active,
        created_at: user.created_at,
        staff_profile: user.staff[0]
          ? {
              staff_id: user.staff[0].staff_id,
              first_name: user.staff[0].first_name,
              last_name: user.staff[0].last_name,
              role: this.toPublicRoleName(user.staff[0].role),
              status: user.staff[0].status,
            }
          : null,
        parent_profile: user.parent[0]
          ? {
              parent_id: user.parent[0].parent_id,
              first_name: user.parent[0].first_name,
              last_name: user.parent[0].last_name,
            }
          : null,
        roles: user.user_roles.map((item) =>
          this.toPublicRoleName(item.roles.role_name),
        ),
      })),
      roles: roles.map((role) => ({
        role_id: role.role_id,
        role_name: this.toPublicRoleName(role.role_name),
      })),
    };
  }

  async assignStaffRole(
    currentUser: {
      user_id: number;
      roleNames?: string[];
      staffRole?: string | null;
    },
    userId: number,
    roleName: string,
  ) {
    if (!this.hasRole(currentUser, ['admin'])) {
      throw new ForbiddenException('Admin role required');
    }

    const normalizedRole = this.normalizeStaffRole(roleName);
    if (!normalizedRole) {
      throw new BadRequestException('Unsupported staff role');
    }

    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
      include: {
        staff: true,
        user_roles: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roleRecord = await this.prisma.roles.upsert({
      where: { role_name: roleName === 'doctor' ? 'doctor' : normalizedRole },
      update: {},
      create: { role_name: roleName === 'doctor' ? 'doctor' : normalizedRole },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      if (user.user_type !== 'staff') {
        await tx.users.update({
          where: { user_id: userId },
          data: { user_type: 'staff' },
        });
      }

      const existingParent = await tx.parent.findFirst({
        where: { user_id: userId },
        include: {
          child_parent: {
            select: {
              child_id: true,
            },
          },
        },
      });
      if (existingParent) {
        if (existingParent.child_parent.length > 0) {
          throw new BadRequestException(
            'Cannot promote a parent account that already has linked children',
          );
        }

        await tx.parent.delete({
          where: { parent_id: existingParent.parent_id },
        });
      }

      const existingStaff = await tx.staff.findFirst({
        where: { user_id: userId },
      });

      if (existingStaff) {
        await tx.staff.update({
          where: { staff_id: existingStaff.staff_id },
          data: {
            role: normalizedRole,
            status: 'active',
          },
        });
      } else {
        await tx.staff.create({
          data: {
            first_name: 'New',
            last_name: 'Staff',
            role: normalizedRole,
            status: 'active',
            user_id: userId,
          },
        });
      }

      const currentUserRoles = await tx.user_roles.findMany({
        where: { user_id: userId },
        include: {
          roles: true,
        },
      });

      const roleIdsToDelete = currentUserRoles
        .filter((item) =>
          [
            'doctor',
            'nurse',
            'psychologist',
            'admin',
            'psychiatrist',
            'parent',
          ].includes(item.roles.role_name),
        )
        .map((item) => ({ user_id: item.user_id, role_id: item.role_id }));

      for (const compositeKey of roleIdsToDelete) {
        await tx.user_roles.delete({
          where: {
            user_id_role_id: compositeKey,
          },
        });
      }

      await tx.user_roles.upsert({
        where: {
          user_id_role_id: {
            user_id: userId,
            role_id: roleRecord.role_id,
          },
        },
        update: {},
        create: {
          user_id: userId,
          role_id: roleRecord.role_id,
        },
      });

      return tx.users.findUnique({
        where: { user_id: userId },
        include: {
          staff: true,
          user_roles: {
            include: {
              roles: true,
            },
          },
        },
      });
    });

    return {
      user_id: result?.user_id,
      username: result?.username,
      staffRole: this.toPublicRoleName(result?.staff[0]?.role),
      roles:
        result?.user_roles.map((item) =>
          this.toPublicRoleName(item.roles.role_name),
        ) ?? [],
    };
  }

  async getStaffCommonDashboard(currentUser: {
    user_id: number;
    user_type: string;
    roleNames?: string[];
    staffRole?: string | null;
  }) {
    if (currentUser.user_type !== 'staff') {
      throw new ForbiddenException('Staff access required');
    }

    const today = this.startOfToday();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const monthStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    );

    const [
      totalSchedules,
      bookedSchedules,
      todayAppointments,
      allAppointments,
      totalStaff,
      totalParents,
      totalChildren,
      invoices,
      upcomingSchedules,
      recentAppointments,
    ] = await Promise.all([
      this.prisma.work_schedules.count(),
      this.prisma.work_schedules.count({ where: { slot_status: 'booked' } }),
      this.prisma.appointments.count({
        where: {
          work_schedules: {
            is: {
              work_date: { gte: today, lt: tomorrow },
            },
          },
          deleted_at: null,
        },
      }),
      this.prisma.appointments.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),
      this.prisma.staff.count(),
      this.prisma.parent.count(),
      this.prisma.child.count(),
      this.prisma.invoice.findMany({
        where: {
          deleted_at: null,
        },
        select: {
          total_amount: true,
          visit: {
            select: {
              visit_date: true,
            },
          },
        },
      }),
      this.prisma.work_schedules.findMany({
        take: 8,
        include: {
          staff: {
            select: {
              first_name: true,
              last_name: true,
              role: true,
            },
          },
          appointments: {
            include: {
              child: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
        orderBy: [{ work_date: 'asc' }, { start_time: 'asc' }],
      }),
      this.prisma.appointments.findMany({
        take: 8,
        where: { deleted_at: null },
        include: {
          child: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
          work_schedules: {
            include: {
              staff: {
                select: {
                  first_name: true,
                  last_name: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const revenue = invoices.reduce(
      (acc, item) => {
        const amount = Number(item.total_amount ?? 0);
        acc.total += amount;

        if (item.visit?.visit_date && item.visit.visit_date >= monthStart) {
          acc.thisMonth += amount;
        }

        return acc;
      },
      { total: 0, thisMonth: 0 },
    );

    return {
      summary: {
        totalSchedules,
        bookedSchedules,
        availableSchedules: totalSchedules - bookedSchedules,
        todayAppointments,
        totalStaff,
        totalParents,
        totalChildren,
        revenue,
        appointmentStatus: allAppointments.map((item) => ({
          status: item.status,
          count: item._count.status,
        })),
      },
      upcomingSchedules: upcomingSchedules.map((schedule) => ({
        ...schedule,
        staff: schedule.staff
          ? {
              ...schedule.staff,
              role: this.toPublicRoleName(schedule.staff.role),
            }
          : null,
      })),
      recentAppointments,
    };
  }

  async createUserByStaff(
    currentUser: {
      user_id: number;
      user_type: string;
      roleNames?: string[];
      staffRole?: string | null;
    },
    dto: CreateUserDto,
  ) {
    if (currentUser.user_type !== 'staff') {
      throw new ForbiddenException('Staff access required');
    }

    if (dto.userType === 'staff' && !this.hasRole(currentUser, ['admin'])) {
      throw new ForbiddenException('Admin role required to create staff users');
    }

    if (dto.userType === 'parent' && dto.roleName) {
      throw new BadRequestException('Parent accounts cannot have a staff role');
    }

    const existingUser = await this.prisma.users.findUnique({
      where: { username: dto.username },
    });
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          username: dto.username,
          password_hash: passwordHash,
          user_type: dto.userType,
        },
      });

      if (dto.userType === 'parent') {
        const parentRole = await tx.roles.upsert({
          where: { role_name: 'parent' },
          update: {},
          create: { role_name: 'parent' },
        });

        await tx.parent.create({
          data: {
            first_name: dto.firstName || 'New',
            last_name: dto.lastName || 'Parent',
            phone: dto.phone || '',
            user_id: user.user_id,
          },
        });

        await tx.user_roles.create({
          data: {
            user_id: user.user_id,
            role_id: parentRole.role_id,
          },
        });

        return {
          user_id: user.user_id,
          username: user.username,
          user_type: user.user_type,
          assignedRole: 'parent',
        };
      }

      const normalizedRole = this.normalizeStaffRole(dto.roleName || '');
      if (!normalizedRole) {
        throw new BadRequestException('Unsupported staff role');
      }

      const publicRole = this.toPublicRoleName(normalizedRole) || normalizedRole;
      const roleRecord = await tx.roles.upsert({
        where: { role_name: publicRole },
        update: {},
        create: { role_name: publicRole },
      });

      await tx.staff.create({
        data: {
          first_name: dto.firstName || 'New',
          last_name: dto.lastName || 'Staff',
          role: normalizedRole,
          status: 'active',
          user_id: user.user_id,
        },
      });

      await tx.user_roles.create({
        data: {
          user_id: user.user_id,
          role_id: roleRecord.role_id,
        },
      });

      return {
        user_id: user.user_id,
        username: user.username,
        user_type: user.user_type,
        assignedRole: publicRole,
      };
    });

    return {
      ...result,
      message: 'User created successfully',
    };
  }

  async getStaffRoleDashboard(
    currentUser: {
      user_id: number;
      user_type: string;
      roleNames?: string[];
      staffRole?: string | null;
    },
    roleName: string,
  ) {
    if (currentUser.user_type !== 'staff') {
      throw new ForbiddenException('Staff access required');
    }

    const publicRole = this.normalizePublicRole(roleName);
    if (!publicRole) {
      throw new BadRequestException('Unsupported dashboard role');
    }

    if (!this.hasRole(currentUser, ['admin', publicRole])) {
      throw new ForbiddenException('Role access denied');
    }

    const today = this.startOfToday();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const staffRecord = await this.prisma.staff.findFirst({
      where: { user_id: currentUser.user_id },
      select: { staff_id: true },
    });

    const currentStaffId = staffRecord?.staff_id ?? -1;
    const internalRole = publicRole === 'doctor' ? 'psychiatrist' : publicRole;

    const [
      staffCount,
      todaySchedules,
      todayAppointments,
      ownAppointments,
      assessments,
      prescriptions,
    ] = await Promise.all([
      this.prisma.staff.count({
        where: { role: internalRole as any, status: 'active' },
      }),
      this.prisma.work_schedules.count({
        where: {
          staff: { role: internalRole as any },
          work_date: { gte: today, lt: tomorrow },
        },
      }),
      this.prisma.appointments.count({
        where: {
          deleted_at: null,
          work_schedules: {
            is: {
              work_date: { gte: today, lt: tomorrow },
              staff: { role: internalRole as any },
            },
          },
        },
      }),
      this.prisma.appointments.findMany({
        take: 8,
        where: {
          deleted_at: null,
          work_schedules: {
            is: {
              staff_id: currentStaffId,
            },
          },
        },
        include: {
          child: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
          work_schedules: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.assessment.count({
        where:
          publicRole === 'psychologist'
            ? { created_by: currentStaffId }
            : undefined,
      }),
      this.prisma.prescription.count({
        where:
          publicRole === 'doctor'
            ? ({
                visit: {
                  appointment: {
                    work_schedules: {
                      staff_id: currentStaffId,
                    },
                  },
                },
              } as any)
            : undefined,
      }),
    ]);

    return {
      role: publicRole,
      summary: {
        staffCount,
        todaySchedules,
        todayAppointments,
        ownAppointmentCount: ownAppointments.length,
        assessments,
        prescriptions,
      },
      ownAppointments,
    };
  }

  private hasRole(
    user: { roleNames?: string[]; staffRole?: string | null },
    roles: string[],
  ) {
    const roleSet = new Set<string>([
      ...(user.staffRole ? [user.staffRole] : []),
      ...(user.roleNames ?? []),
    ]);

    if (roleSet.has('admin')) {
      return true;
    }

    return roles.some((role) => {
      if (role === 'doctor') {
        return roleSet.has('doctor') || roleSet.has('psychiatrist');
      }

      return roleSet.has(role);
    });
  }

  private normalizeStaffRole(roleName: string) {
    if (roleName === 'doctor') {
      return 'psychiatrist';
    }

    if (['admin', 'nurse', 'psychologist', 'psychiatrist'].includes(roleName)) {
      return roleName;
    }

    return null;
  }

  private normalizePublicRole(roleName: string) {
    if (roleName === 'psychiatrist') {
      return 'doctor';
    }

    if (['doctor', 'nurse', 'psychologist', 'admin'].includes(roleName)) {
      return roleName;
    }

    return null;
  }

  private toPublicRoleName(roleName?: string | null) {
    if (!roleName) {
      return null;
    }

    return roleName === 'psychiatrist' ? 'doctor' : roleName;
  }

  private startOfToday() {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
}
