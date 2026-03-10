import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  // =========================================================
  // หมวด: การจัดการตารางงานแพทย์ (Work Schedules)
  // =========================================================

  // ดูตารางที่ว่าง (สำหรับหน้าจองคิว)
  async getAvailableSchedules(user: any, staffId?: number, date?: string) {
    return this.prisma.work_schedules.findMany({
      where: {
        staff_id: staffId ? Number(staffId) : undefined,
       // work_date: date ? new Date(date) : undefined,
        slot_status: 'available', 
      },
      include: { staff: true }, 
      orderBy: { work_date: 'asc' },
    });
  }

  // หมอดูตารางเวรของตัวเองทั้งหมด
  async getMySchedules(user: any) {
    if (user.user_type !== 'staff') throw new ForbiddenException('เฉพาะเจ้าหน้าที่เท่านั้น');
    
    const staff = await this.prisma.staff.findFirst({ where: { user_id: user.user_id }});
    if (!staff) throw new NotFoundException('ไม่พบข้อมูลเจ้าหน้าที่');

    return this.prisma.work_schedules.findMany({
      where: { staff_id: staff.staff_id },
      orderBy: [{ work_date: 'desc' }, { start_time: 'asc' }],
    });
  }

  // หมอเพิ่มตารางเวร (Add Schedule)
  async createWorkSchedule(user: any, data: { work_date: string; start_time: string; end_time: string }) {
    if (user.user_type !== 'staff') throw new ForbiddenException('เฉพาะเจ้าหน้าที่เท่านั้น');
    
    const staff = await this.prisma.staff.findFirst({ where: { user_id: user.user_id }});
    if (!staff) throw new NotFoundException('ไม่พบข้อมูลเจ้าหน้าที่');

    return this.prisma.work_schedules.create({
      data: {
        staff_id: staff.staff_id,
        work_date: new Date(data.work_date),
        start_time: new Date(data.start_time),
        end_time: new Date(data.end_time),
        slot_status: 'available',
      }
    });
  }

  // หมอแก้ไขตารางเวร (Edit Schedule)
  async updateWorkSchedule(user: any, scheduleId: number, data: any) {
    if (user.user_type !== 'staff') throw new ForbiddenException('เฉพาะเจ้าหน้าที่เท่านั้น');
    const staff = await this.prisma.staff.findFirst({ where: { user_id: user.user_id }});
    
    const schedule = await this.prisma.work_schedules.findUnique({ where: { schedule_id: scheduleId } });
    if (!schedule) throw new NotFoundException('ไม่พบตารางงานนี้');
    
    // ป้องกันการแก้ตารางของหมอคนอื่น (ยกเว้นเป็นแอดมิน)
    if (schedule.staff_id !== staff?.staff_id && user.staffRole !== 'admin') {
      throw new ForbiddenException('คุณสามารถแก้ไขได้เฉพาะตารางงานของตนเองเท่านั้น');
    }

    return this.prisma.work_schedules.update({
      where: { schedule_id: scheduleId },
      data: {
        work_date: data.work_date ? new Date(data.work_date) : undefined,
        start_time: data.start_time ? new Date(data.start_time) : undefined,
        end_time: data.end_time ? new Date(data.end_time) : undefined,
        slot_status: data.slot_status,
      }
    });
  }

  // หมอลบตารางเวร (Delete Schedule)
  async deleteWorkSchedule(user: any, scheduleId: number) {
    if (user.user_type !== 'staff') throw new ForbiddenException('เฉพาะเจ้าหน้าที่เท่านั้น');
    const staff = await this.prisma.staff.findFirst({ where: { user_id: user.user_id }});

    const schedule = await this.prisma.work_schedules.findUnique({ where: { schedule_id: scheduleId } });
    if (!schedule) throw new NotFoundException('ไม่พบตารางงานนี้');

    if (schedule.staff_id !== staff?.staff_id && user.staffRole !== 'admin') {
      throw new ForbiddenException('คุณสามารถลบได้เฉพาะตารางงานของตนเองเท่านั้น');
    }

    // เซฟตี้: ห้ามลบถ้ามีคนไข้จองคิวนี้ไปแล้ว
    if (schedule.slot_status === 'booked') {
      throw new BadRequestException('ไม่สามารถลบตารางนี้ได้เนื่องจากมีผู้ป่วยจองคิวแล้ว กรุณายกเลิกนัดหมายก่อน');
    }

    return this.prisma.work_schedules.delete({
      where: { schedule_id: scheduleId }
    });
  }

  // =========================================================
  // หมวด: การจัดการนัดหมาย (Appointments)
  // =========================================================

  async getAppointments(user: any, patientId?: number, date?: string) {
    let whereCondition: any = {
      deleted_at: null,
      work_schedules: date ? { work_date: new Date(date) } : undefined,
    };

    if (user.user_type === 'parent') {
      const parentRecord = await this.prisma.parent.findFirst({
        where: { user_id: user.user_id },
        include: { child_parent: true }
      });
      const childIds = parentRecord?.child_parent.map(cp => cp.child_id) || [];
      whereCondition.patient_id = { in: childIds }; 
      
    } else if (user.user_type === 'staff') {
      if (user.staffRole === 'psychiatrist' || user.staffRole === 'psychologist') {
        const staffRecord = await this.prisma.staff.findFirst({ where: { user_id: user.user_id }});
        if (staffRecord) {
          whereCondition.work_schedules = { 
            ...whereCondition.work_schedules, 
            staff_id: staffRecord.staff_id 
          };
        }
      } else {
        if (patientId) whereCondition.patient_id = Number(patientId);
      }
    }

    return this.prisma.appointments.findMany({
      where: whereCondition,
      include: {
        child: true,
        work_schedules: { include: { staff: true } },
        room: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async bookAppointment(user: any, data: { patient_id: number; schedule_id: number; room_id?: number }) {
    return this.prisma.$transaction(async (tx) => {
      
      if (user.user_type === 'parent') {
        const parentRecord = await tx.parent.findFirst({
          where: { user_id: user.user_id },
          include: { child_parent: true }
        });
        const childIds = parentRecord?.child_parent.map(cp => cp.child_id) || [];
        if (!childIds.includes(data.patient_id)) {
          throw new ForbiddenException('คุณสามารถจองคิวให้ได้เฉพาะบุตรหลานในความดูแลเท่านั้น');
        }
      } else if (user.user_type === 'staff') {
        if (user.staffRole === 'psychiatrist' || user.staffRole === 'psychologist') {
          throw new ForbiddenException('แพทย์ไม่สามารถจองคิวให้ผู้ป่วยโดยตรงได้');
        }
      }

      const schedule = await tx.work_schedules.findUnique({ where: { schedule_id: data.schedule_id } });
      if (!schedule || schedule.slot_status !== 'available') {
        throw new BadRequestException('คิวนี้ถูกจองไปแล้ว หรือไม่ว่างให้บริการ');
      }

      await tx.work_schedules.update({
        where: { schedule_id: data.schedule_id },
        data: { slot_status: 'booked' },
      });

      return tx.appointments.create({
        data: {
          patient_id: data.patient_id,
          schedule_id: data.schedule_id,
          room_id: data.room_id || null,
          status: 'scheduled',
        },
      });
    });
  }

  async cancelAppointment(user: any, appointmentId: number) {
    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointments.findUnique({
        where: { appointment_id: appointmentId },
        include: { work_schedules: true }
      });

      if (!appointment) throw new NotFoundException('ไม่พบข้อมูลการนัดหมายนี้');

      if (user.user_type === 'parent') {
        const parentRecord = await tx.parent.findFirst({
          where: { user_id: user.user_id },
          include: { child_parent: true }
        });
        const childIds = parentRecord?.child_parent.map(cp => cp.child_id) || [];
        if (!childIds.includes(Number(appointment.patient_id))) {
          throw new ForbiddenException('คุณไม่มีสิทธิ์ยกเลิกคิวตรวจที่ไม่ใช่ของบุตรหลานคุณ');
        }
      } else if (user.user_type === 'staff') {
        if (user.staffRole === 'psychiatrist' || user.staffRole === 'psychologist') {
          const staffRecord = await tx.staff.findFirst({ where: { user_id: user.user_id }});
          if (appointment.work_schedules?.staff_id !== staffRecord?.staff_id) {
            throw new ForbiddenException('แพทย์สามารถยกเลิกได้เฉพาะคิวตรวจของตนเองเท่านั้น');
          }
        }
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
}