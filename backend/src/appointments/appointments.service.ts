import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AuthUser = {
  user_id: number;
  user_type: 'staff' | 'parent';
  staffRole?: string | null;
  roleNames?: string[];
};

type SchedulePayload = {
  work_date: string;
  start_time: string;
  end_time: string;
};

type ScheduleUpdatePayload = Partial<
  SchedulePayload & {
    slot_status: 'available' | 'blocked';
  }
>;

type BookAppointmentPayload = {
  patient_id: number;
  schedule_id: number;
  room_id?: number;
};

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableSchedules(
    _user: AuthUser,
    staffId?: number,
    date?: string,
  ) {
    return this.prisma.work_schedules.findMany({
      where: {
        staff_id: staffId ? Number(staffId) : undefined,
        slot_status: 'available',
        ...(date ? { work_date: this.toDayRange(date) } : {}),
      },
      include: {
        staff: {
          select: {
            staff_id: true,
            first_name: true,
            last_name: true,
            role: true,
          },
        },
      },
      orderBy: [{ work_date: 'asc' }, { start_time: 'asc' }],
    });
  }

  async getScheduleById(_user: AuthUser, scheduleId: number) {
    const schedule = await this.prisma.work_schedules.findUnique({
      where: { schedule_id: scheduleId },
      include: {
        staff: {
          select: {
            staff_id: true,
            first_name: true,
            last_name: true,
            role: true,
          },
        },
        appointments: {
          select: {
            appointment_id: true,
            status: true,
            patient_id: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  async getBookingContext(user: AuthUser) {
    const rooms = await this.prisma.room.findMany({
      orderBy: { room_name: 'asc' },
    });

    if (user.user_type !== 'parent') {
      return { children: [], rooms };
    }

    const parentRecord = await this.prisma.parent.findFirst({
      where: { user_id: user.user_id },
      include: {
        child_parent: {
          include: {
            child: {
              select: {
                child_id: true,
                first_name: true,
                last_name: true,
                birth_date: true,
              },
            },
          },
        },
      },
    });

    const children =
      parentRecord?.child_parent
        .map((item) => item.child)
        .filter((child): child is NonNullable<typeof child> =>
          Boolean(child),
        ) ?? [];

    return { children, rooms };
  }

  async getMySchedules(user: AuthUser) {
    this.ensureStaff(user);

    const staff = await this.getStaffRecord(user.user_id);
    return this.prisma.work_schedules.findMany({
      where: { staff_id: staff.staff_id },
      include: {
        appointments: {
          select: {
            appointment_id: true,
            status: true,
            patient_id: true,
            child: {
              select: {
                child_id: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
      orderBy: [{ work_date: 'desc' }, { start_time: 'asc' }],
    });
  }

  async createWorkSchedule(user: AuthUser, data: SchedulePayload) {
    this.ensureScheduleManager(user);

    const staff = await this.getStaffRecord(user.user_id);
    const normalized = this.normalizeScheduleInput(data);

    await this.ensureNoOverlappingSchedule(
      staff.staff_id,
      normalized.workDate,
      normalized.startTime,
      normalized.endTime,
    );

    return this.prisma.work_schedules.create({
      data: {
        staff_id: staff.staff_id,
        work_date: normalized.workDate,
        start_time: normalized.startTime,
        end_time: normalized.endTime,
        slot_status: 'available',
      },
    });
  }

  async updateWorkSchedule(
    user: AuthUser,
    scheduleId: number,
    data: ScheduleUpdatePayload,
  ) {
    this.ensureScheduleManager(user);

    const staff = await this.getStaffRecord(user.user_id);
    const schedule = await this.prisma.work_schedules.findUnique({
      where: { schedule_id: scheduleId },
      include: { appointments: true },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (
      schedule.staff_id !== staff.staff_id &&
      !this.hasRole(user, ['admin'])
    ) {
      throw new ForbiddenException('You can only edit your own schedules');
    }

    if (schedule.appointments && schedule.appointments.status !== 'cancelled') {
      throw new BadRequestException('Booked schedules cannot be edited');
    }

    const mergedDate =
      data.work_date ?? this.formatDateInput(schedule.work_date);
    const mergedStart =
      data.start_time ?? this.formatTimeInput(schedule.start_time);
    const mergedEnd = data.end_time ?? this.formatTimeInput(schedule.end_time);
    const normalized = this.normalizeScheduleInput({
      work_date: mergedDate,
      start_time: mergedStart,
      end_time: mergedEnd,
    });

    await this.ensureNoOverlappingSchedule(
      schedule.staff_id ?? staff.staff_id,
      normalized.workDate,
      normalized.startTime,
      normalized.endTime,
      scheduleId,
    );

    return this.prisma.work_schedules.update({
      where: { schedule_id: scheduleId },
      data: {
        work_date: normalized.workDate,
        start_time: normalized.startTime,
        end_time: normalized.endTime,
        slot_status: data.slot_status ?? schedule.slot_status ?? 'available',
      },
    });
  }

  async deleteWorkSchedule(user: AuthUser, scheduleId: number) {
    this.ensureScheduleManager(user);

    const staff = await this.getStaffRecord(user.user_id);
    const schedule = await this.prisma.work_schedules.findUnique({
      where: { schedule_id: scheduleId },
      include: { appointments: true },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (
      schedule.staff_id !== staff.staff_id &&
      !this.hasRole(user, ['admin'])
    ) {
      throw new ForbiddenException('You can only delete your own schedules');
    }

    if (schedule.appointments && schedule.appointments.status !== 'cancelled') {
      throw new BadRequestException('Booked schedules cannot be deleted');
    }

    return this.prisma.work_schedules.delete({
      where: { schedule_id: scheduleId },
    });
  }

  async getAppointments(user: AuthUser, patientId?: number, date?: string) {
    let workScheduleFilter:
      | {
          is: {
            work_date?: { gte: Date; lt: Date };
            staff_id?: number;
          };
        }
      | undefined;

    if (date) {
      workScheduleFilter = { is: { work_date: this.toDayRange(date) } };
    }

    const where: Record<string, unknown> = {
      deleted_at: null,
      ...(workScheduleFilter ? { work_schedules: workScheduleFilter } : {}),
    };

    if (user.user_type === 'parent') {
      const parentRecord = await this.prisma.parent.findFirst({
        where: { user_id: user.user_id },
        include: { child_parent: true },
      });

      const childIds =
        parentRecord?.child_parent.map((item) => item.child_id) ?? [];
      where.patient_id = { in: childIds.length > 0 ? childIds : [-1] };
    }

    if (user.user_type === 'staff') {
      if (this.hasRole(user, ['doctor', 'psychologist'])) {
        const staffRecord = await this.getStaffRecord(user.user_id);
        workScheduleFilter = {
          is: {
            ...(date ? { work_date: this.toDayRange(date) } : {}),
            staff_id: staffRecord.staff_id,
          },
        };
        where.work_schedules = workScheduleFilter;
      } else if (patientId) {
        where.patient_id = Number(patientId);
      }
    }

    return this.prisma.appointments.findMany({
      where,
      include: {
        child: {
          select: {
            child_id: true,
            first_name: true,
            last_name: true,
          },
        },
        work_schedules: {
          include: {
            staff: {
              select: {
                staff_id: true,
                first_name: true,
                last_name: true,
                role: true,
              },
            },
          },
        },
        room: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async bookAppointment(user: AuthUser, data: BookAppointmentPayload) {
    return this.prisma.$transaction(async (tx) => {
      const child = await tx.child.findUnique({
        where: { child_id: data.patient_id },
        select: { child_id: true },
      });

      if (!child) {
        throw new NotFoundException('Patient not found');
      }

      if (user.user_type === 'parent') {
        const parentRecord = await tx.parent.findFirst({
          where: { user_id: user.user_id },
          include: { child_parent: true },
        });

        const childIds =
          parentRecord?.child_parent.map((item) => item.child_id) ?? [];
        if (!childIds.includes(data.patient_id)) {
          throw new ForbiddenException('You can only book for your own child');
        }
      }

      if (
        user.user_type === 'staff' &&
        this.hasRole(user, ['doctor', 'psychologist'])
      ) {
        throw new ForbiddenException(
          'Doctors cannot book appointments directly',
        );
      }

      if (data.room_id) {
        const room = await tx.room.findUnique({
          where: { room_id: data.room_id },
          select: { room_id: true },
        });

        if (!room) {
          throw new NotFoundException('Room not found');
        }
      }

      const schedule = await tx.work_schedules.findUnique({
        where: { schedule_id: data.schedule_id },
        include: { appointments: true },
      });

      if (!schedule) {
        throw new NotFoundException('Schedule not found');
      }

      if (schedule.slot_status !== 'available') {
        throw new BadRequestException('This schedule is no longer available');
      }

      if (
        schedule.appointments &&
        schedule.appointments.status !== 'cancelled'
      ) {
        throw new BadRequestException(
          'This schedule already has an appointment',
        );
      }

      if (schedule.work_date && schedule.work_date < this.startOfToday()) {
        throw new BadRequestException('Cannot book an appointment in the past');
      }

      const appointment = await tx.appointments.create({
        data: {
          patient_id: data.patient_id,
          schedule_id: data.schedule_id,
          room_id: data.room_id ?? null,
          status: 'scheduled',
        },
        include: {
          child: true,
          work_schedules: {
            include: {
              staff: true,
            },
          },
          room: true,
        },
      });

      await tx.work_schedules.update({
        where: { schedule_id: data.schedule_id },
        data: { slot_status: 'booked' },
      });

      return appointment;
    });
  }

  async cancelAppointment(user: AuthUser, appointmentId: number) {
    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointments.findUnique({
        where: { appointment_id: appointmentId },
        include: { work_schedules: true },
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      if (user.user_type === 'parent') {
        const parentRecord = await tx.parent.findFirst({
          where: { user_id: user.user_id },
          include: { child_parent: true },
        });

        const childIds =
          parentRecord?.child_parent.map((item) => item.child_id) ?? [];
        if (!childIds.includes(Number(appointment.patient_id))) {
          throw new ForbiddenException(
            'You do not have access to this appointment',
          );
        }
      }

      if (
        user.user_type === 'staff' &&
        this.hasRole(user, ['doctor', 'psychologist'])
      ) {
        const staffRecord = await this.getStaffRecord(user.user_id, tx);
        if (appointment.work_schedules?.staff_id !== staffRecord.staff_id) {
          throw new ForbiddenException(
            'You can only cancel your own appointments',
          );
        }
      }

      if (appointment.status === 'cancelled') {
        return appointment;
      }

      const updatedAppointment = await tx.appointments.update({
        where: { appointment_id: appointmentId },
        data: { status: 'cancelled' },
      });

      if (appointment.schedule_id) {
        await tx.work_schedules.update({
          where: { schedule_id: appointment.schedule_id },
          data: { slot_status: 'available' },
        });
      }

      return updatedAppointment;
    });
  }

  private ensureStaff(user: AuthUser) {
    if (user.user_type !== 'staff') {
      throw new ForbiddenException('Staff access required');
    }
  }

  private ensureScheduleManager(user: AuthUser) {
    this.ensureStaff(user);

    if (!this.hasRole(user, ['doctor', 'psychologist', 'admin'])) {
      throw new ForbiddenException('This role cannot manage doctor schedules');
    }
  }

  private hasRole(user: AuthUser, roles: string[]) {
    const roleSet = new Set<string>([
      ...(user.staffRole ? [user.staffRole] : []),
      ...(user.roleNames ?? []),
    ]);

    return roles.some((role) => {
      if (role === 'doctor') {
        return roleSet.has('doctor') || roleSet.has('psychiatrist');
      }

      if (role === 'psychiatrist') {
        return roleSet.has('doctor') || roleSet.has('psychiatrist');
      }

      return roleSet.has(role);
    });
  }

  private async getStaffRecord(
    userId: number,
    prismaLike: PrismaService | any = this.prisma,
  ) {
    const staff = await prismaLike.staff.findFirst({
      where: { user_id: userId },
      select: {
        staff_id: true,
        user_id: true,
        role: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found');
    }

    return staff;
  }

  private normalizeScheduleInput(data: SchedulePayload) {
    const workDate = this.parseDateOnly(data.work_date);
    const startTime = this.parseTimeOnly(data.start_time);
    const endTime = this.parseTimeOnly(data.end_time);

    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    return { workDate, startTime, endTime };
  }

  private parseDateOnly(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Invalid work_date format');
    }

    return new Date(`${value}T00:00:00.000Z`);
  }

  private parseTimeOnly(value: string) {
    if (!/^\d{2}:\d{2}$/.test(value)) {
      throw new BadRequestException('Invalid time format');
    }

    return new Date(`1970-01-01T${value}:00.000Z`);
  }

  private formatDateInput(value: Date | null) {
    if (!value) {
      throw new BadRequestException('Schedule date is missing');
    }

    return value.toISOString().slice(0, 10);
  }

  private formatTimeInput(value: Date | null) {
    if (!value) {
      throw new BadRequestException('Schedule time is missing');
    }

    return value.toISOString().slice(11, 16);
  }

  private toDayRange(value: string) {
    const start = this.parseDateOnly(value);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { gte: start, lt: end };
  }

  private startOfToday() {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private async ensureNoOverlappingSchedule(
    staffId: number,
    workDate: Date,
    startTime: Date,
    endTime: Date,
    ignoreScheduleId?: number,
  ) {
    const existingSchedule = await this.prisma.work_schedules.findFirst({
      where: {
        staff_id: staffId,
        work_date: { gte: workDate, lt: this.nextDay(workDate) },
        start_time: { lt: endTime },
        end_time: { gt: startTime },
        ...(ignoreScheduleId
          ? {
              NOT: {
                schedule_id: ignoreScheduleId,
              },
            }
          : {}),
      },
      select: { schedule_id: true },
    });

    if (existingSchedule) {
      throw new BadRequestException(
        'This time overlaps with an existing schedule',
      );
    }
  }

  private nextDay(date: Date) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }
}
