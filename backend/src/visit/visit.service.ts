import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InvoiceService } from '../invoice/invoice.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { UpsertPrescriptionItemDto } from './dto/upsert-prescription-item.dto';
import { UpsertVitalSignsDto } from './dto/upsert-vital-signs.dto';

type AuthUser = {
  user_id: number;
  user_type: 'staff' | 'parent';
  staffRole?: string | null;
  roleNames?: string[];
};

type VisitFilters = {
  appointmentId?: number;
  patientId?: number;
  date?: string;
};

@Injectable()
export class VisitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceService: InvoiceService,
  ) {}

  async getVisits(user: AuthUser, filters: VisitFilters) {
    const where = await this.buildVisitWhere(user, filters);

    const visits = await this.prisma.visit.findMany({
      where,
      include: this.visitInclude(),
      orderBy: [{ visit_date: 'desc' }, { visit_id: 'desc' }],
    });

    return visits.map((visit) => this.serializeVisit(visit));
  }

  async getVisitById(user: AuthUser, visitId: number) {
    const visit = await this.prisma.visit.findUnique({
      where: { visit_id: visitId },
      include: this.visitInclude(),
    });

    if (!visit || visit.deleted_at) {
      throw new NotFoundException('Visit not found');
    }

    await this.assertVisitAccess(user, visit);
    return this.serializeVisit(visit);
  }

  async getVisitByAppointment(user: AuthUser, appointmentId: number) {
    const visit = await this.prisma.visit.findFirst({
      where: {
        appointment_id: appointmentId,
        deleted_at: null,
      },
      include: this.visitInclude(),
    });

    if (!visit) {
      throw new NotFoundException('Visit not found for this appointment');
    }

    await this.assertVisitAccess(user, visit);
    return this.serializeVisit(visit);
  }

  async createVisit(user: AuthUser, dto: CreateVisitDto) {
    this.ensureVisitManager(user);

    return this.prisma.$transaction(
      async (tx) => {
        const appointment = await tx.appointments.findUnique({
          where: { appointment_id: dto.appointment_id },
          include: {
            visit: true,
            work_schedules: true,
          },
        });

        if (!appointment || appointment.deleted_at) {
          throw new NotFoundException('Appointment not found');
        }

        if (appointment.status === 'cancelled') {
          throw new BadRequestException(
            'Cannot create a visit for a cancelled appointment',
          );
        }

        if (appointment.approval_status !== 'approved') {
          throw new BadRequestException(
            'Appointment must be approved by admin before creating a visit',
          );
        }

        if (appointment.visit) {
          throw new BadRequestException(
            'Visit already exists for this appointment',
          );
        }

        await this.assertAppointmentStaffAccess(
          user,
          appointment.work_schedules?.staff_id,
        );

        const visit = await tx.visit.create({
          data: {
            appointment_id: dto.appointment_id,
            visit_date: dto.visit_date ? new Date(dto.visit_date) : undefined,
          },
        });

        if (dto.vital_signs) {
          await tx.vital_signs.create({
            data: {
              visit_id: visit.visit_id,
              ...this.toVitalSignsWriteData(dto.vital_signs),
            },
          });
        }

        if (dto.diagnoses?.length) {
          await tx.diagnose.createMany({
            data: dto.diagnoses
              .map((diagnosis_text) => diagnosis_text.trim())
              .filter(Boolean)
              .map((diagnosis_text) => ({
                visit_id: visit.visit_id,
                diagnosis_text,
              })),
          });
        }

        if (dto.treatment_plans?.length) {
          await tx.treatment_plan.createMany({
            data: dto.treatment_plans
              .map((plan_detail) => plan_detail.trim())
              .filter(Boolean)
              .map((plan_detail) => ({
                visit_id: visit.visit_id,
                plan_detail,
              })),
          });
        }

        await this.syncPrescriptions(tx, visit.visit_id, dto.prescriptions);
        await this.syncServiceItems(
          user,
          tx,
          visit.visit_id,
          dto.service_items,
        );

        await tx.appointments.update({
          where: { appointment_id: dto.appointment_id },
          data: { status: 'completed' },
        });

        const createdVisit = await tx.visit.findUnique({
          where: { visit_id: visit.visit_id },
          include: this.visitInclude(),
        });

        if (!createdVisit) {
          throw new NotFoundException('Visit not found after creation');
        }

        return this.serializeVisit(createdVisit);
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );
  }

  async updateVisit(user: AuthUser, visitId: number, dto: UpdateVisitDto) {
    this.ensureVisitManager(user);

    return this.prisma.$transaction(
      async (tx) => {
        const existingVisit = await tx.visit.findUnique({
          where: { visit_id: visitId },
          include: this.visitInclude(),
        });

        if (!existingVisit || existingVisit.deleted_at) {
          throw new NotFoundException('Visit not found');
        }

        await this.assertAppointmentStaffAccess(
          user,
          existingVisit.appointments?.work_schedules?.staff_id,
        );

        await tx.visit.update({
          where: { visit_id: visitId },
          data: {
            visit_date: dto.visit_date ? new Date(dto.visit_date) : undefined,
          },
        });

        if (dto.vital_signs) {
          await tx.vital_signs.upsert({
            where: { visit_id: visitId },
            update: this.toVitalSignsWriteData(dto.vital_signs),
            create: {
              visit_id: visitId,
              ...this.toVitalSignsWriteData(dto.vital_signs),
            },
          });
        }

        if (dto.diagnoses) {
          await tx.diagnose.deleteMany({ where: { visit_id: visitId } });
          const diagnoses = dto.diagnoses
            .map((diagnosis_text) => diagnosis_text.trim())
            .filter(Boolean);

          if (diagnoses.length) {
            await tx.diagnose.createMany({
              data: diagnoses.map((diagnosis_text) => ({
                visit_id: visitId,
                diagnosis_text,
              })),
            });
          }
        }

        if (dto.treatment_plans) {
          await tx.treatment_plan.deleteMany({ where: { visit_id: visitId } });
          const plans = dto.treatment_plans
            .map((plan_detail) => plan_detail.trim())
            .filter(Boolean);

          if (plans.length) {
            await tx.treatment_plan.createMany({
              data: plans.map((plan_detail) => ({
                visit_id: visitId,
                plan_detail,
              })),
            });
          }
        }

        if (dto.prescriptions !== undefined) {
          await this.syncPrescriptions(tx, visitId, dto.prescriptions);
        }

        if (dto.service_items !== undefined) {
          await this.syncServiceItems(user, tx, visitId, dto.service_items);
        }

        if (existingVisit.appointment_id) {
          await tx.appointments.update({
            where: { appointment_id: existingVisit.appointment_id },
            data: { status: 'completed' },
          });
        }

        const updatedVisit = await tx.visit.findUnique({
          where: { visit_id: visitId },
          include: this.visitInclude(),
        });

        if (!updatedVisit) {
          throw new NotFoundException('Visit not found after update');
        }

        return this.serializeVisit(updatedVisit);
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );
  }

  private async buildVisitWhere(user: AuthUser, filters: VisitFilters) {
    const where: Record<string, unknown> = {
      deleted_at: null,
      ...(filters.appointmentId
        ? { appointment_id: filters.appointmentId }
        : {}),
      ...(filters.date ? { visit_date: this.toDayRange(filters.date) } : {}),
    };

    if (user.user_type === 'parent') {
      const childIds = await this.getParentChildIds(user.user_id);
      where.appointments = {
        is: {
          patient_id: { in: childIds.length ? childIds : [-1] },
        },
      };
      return where;
    }

    if (this.hasRole(user, ['doctor', 'psychologist'])) {
      const staff = await this.getStaffRecord(user.user_id);
      where.appointments = {
        is: {
          work_schedules: {
            is: {
              staff_id: staff.staff_id,
            },
          },
        },
      };
      return where;
    }

    if (filters.patientId) {
      where.appointments = {
        is: {
          patient_id: filters.patientId,
        },
      };
    }

    return where;
  }

  private async assertVisitAccess(user: AuthUser, visit: any) {
    if (user.user_type === 'parent') {
      const childIds = await this.getParentChildIds(user.user_id);
      if (!childIds.includes(Number(visit.appointments?.patient_id))) {
        throw new ForbiddenException('You do not have access to this visit');
      }
      return;
    }

    if (this.hasRole(user, ['doctor', 'psychologist'])) {
      const staff = await this.getStaffRecord(user.user_id);
      if (visit.appointments?.work_schedules?.staff_id !== staff.staff_id) {
        throw new ForbiddenException('You do not have access to this visit');
      }
    }
  }

  private ensureVisitManager(user: AuthUser) {
    if (user.user_type !== 'staff') {
      throw new ForbiddenException('Staff access required');
    }

    if (!this.hasRole(user, ['admin', 'nurse', 'doctor', 'psychologist'])) {
      throw new ForbiddenException('This role cannot manage visits');
    }
  }

  private async assertAppointmentStaffAccess(
    user: AuthUser,
    scheduleStaffId?: number | null,
  ) {
    if (user.user_type !== 'staff') {
      throw new ForbiddenException('Staff access required');
    }

    if (!this.hasRole(user, ['doctor', 'psychologist'])) {
      return;
    }

    const staff = await this.getStaffRecord(user.user_id);
    if (scheduleStaffId !== staff.staff_id) {
      throw new ForbiddenException(
        'You can only manage visits for your own appointments',
      );
    }
  }

  private async syncPrescriptions(
    tx: Prisma.TransactionClient,
    visitId: number,
    items: UpsertPrescriptionItemDto[] | undefined,
  ) {
    if (items === undefined) {
      return;
    }

    const normalizedItems = this.normalizePrescriptionItems(items);
    const existingPrescriptions = await tx.prescription.findMany({
      where: { visit_id: visitId },
      orderBy: { prescription_id: 'asc' },
    });

    const primaryPrescription =
      existingPrescriptions[0] ??
      (normalizedItems.length > 0
        ? await tx.prescription.create({
            data: { visit_id: visitId },
          })
        : null);

    const existingIds = existingPrescriptions.map(
      (item) => item.prescription_id,
    );
    const primaryId = primaryPrescription?.prescription_id ?? null;
    const allPrescriptionIds = primaryId
      ? Array.from(new Set([...existingIds, primaryId]))
      : existingIds;
    const extraPrescriptionIds = allPrescriptionIds.filter(
      (id) => id !== primaryId,
    );

    if (allPrescriptionIds.length > 0) {
      await tx.prescription_item.deleteMany({
        where: {
          prescription_id: {
            in: allPrescriptionIds,
          },
        },
      });
    }

    if (extraPrescriptionIds.length > 0) {
      await tx.prescription.deleteMany({
        where: {
          prescription_id: {
            in: extraPrescriptionIds,
          },
        },
      });
    }

    if (!primaryPrescription) {
      await this.syncInvoiceAfterPrescriptionChange(tx, visitId);
      return;
    }

    if (normalizedItems.length === 0) {
      await tx.prescription.delete({
        where: {
          prescription_id: primaryPrescription.prescription_id,
        },
      });
      await this.syncInvoiceAfterPrescriptionChange(tx, visitId);
      return;
    }

    const drugIds = normalizedItems.map((item) => item.drug_id);
    const drugs = await tx.drug.findMany({
      where: {
        drug_id: {
          in: drugIds,
        },
      },
      select: {
        drug_id: true,
      },
    });

    if (drugs.length !== drugIds.length) {
      throw new BadRequestException(
        'One or more prescribed drugs were not found',
      );
    }

    await tx.prescription_item.createMany({
      data: normalizedItems.map((item) => ({
        prescription_id: primaryPrescription.prescription_id,
        drug_id: item.drug_id,
        quantity: item.quantity,
      })),
    });

    await this.syncInvoiceAfterPrescriptionChange(tx, visitId);
  }

  private normalizePrescriptionItems(items: UpsertPrescriptionItemDto[]) {
    const quantities = new Map<number, number>();

    for (const item of items) {
      quantities.set(
        item.drug_id,
        (quantities.get(item.drug_id) ?? 0) + item.quantity,
      );
    }

    return [...quantities.entries()].map(([drug_id, quantity]) => ({
      drug_id,
      quantity,
    }));
  }

  private async syncInvoiceAfterPrescriptionChange(
    tx: Prisma.TransactionClient,
    visitId: number,
  ) {
    try {
      await this.invoiceService.syncInvoiceForVisitTx(tx, visitId);
    } catch (error) {
      if (
        error instanceof NotFoundException &&
        error.message === 'Invoice not found for this visit'
      ) {
        return;
      }

      throw error;
    }
  }

  private async syncServiceItems(
    user: AuthUser,
    tx: Prisma.TransactionClient,
    visitId: number,
    items:
      | Array<{
          description: string;
          qty: number;
          unit_price: number;
        }>
      | undefined,
  ) {
    if (items === undefined) {
      return;
    }

    this.invoiceService.ensureServicePriceManager(user);

    await this.invoiceService.syncInvoiceForVisitTx(tx, visitId, items);
  }

  private toVitalSignsWriteData(vitalSigns: UpsertVitalSignsDto) {
    return {
      ...(vitalSigns.weight_kg !== undefined
        ? { weight_kg: vitalSigns.weight_kg }
        : {}),
      ...(vitalSigns.height_cm !== undefined
        ? { height_cm: vitalSigns.height_cm }
        : {}),
      ...(vitalSigns.bp_systolic !== undefined
        ? { bp_systolic: vitalSigns.bp_systolic }
        : {}),
      ...(vitalSigns.bp_diastolic !== undefined
        ? { bp_diastolic: vitalSigns.bp_diastolic }
        : {}),
      ...(vitalSigns.heart_rate !== undefined
        ? { heart_rate: vitalSigns.heart_rate }
        : {}),
      ...(vitalSigns.note !== undefined ? { note: vitalSigns.note } : {}),
    };
  }

  private visitInclude() {
    return {
      appointments: {
        include: {
          child: {
            select: {
              child_id: true,
              first_name: true,
              last_name: true,
              birth_date: true,
            },
          },
          booked_by: {
            select: {
              user_id: true,
              username: true,
              parent: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
          room: true,
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
        },
      },
      vital_signs: true,
      diagnose: {
        orderBy: { diagnose_id: 'asc' as const },
      },
      treatment_plan: {
        orderBy: { plan_id: 'asc' as const },
      },
      prescription: {
        include: {
          prescription_item: {
            include: {
              drug: true,
            },
            orderBy: { prescription_item_id: 'asc' as const },
          },
        },
        orderBy: { prescription_id: 'asc' as const },
      },
      invoice: {
        include: {
          invoice_item: {
            include: {
              prescription_item: {
                include: {
                  drug: true,
                },
              },
            },
            orderBy: { invoice_item_id: 'asc' as const },
          },
          payment: {
            orderBy: { payment_id: 'asc' as const },
          },
        },
        where: {
          deleted_at: null,
        },
        orderBy: { invoice_id: 'desc' as const },
      },
    };
  }

  private serializeVisit(visit: any) {
    return {
      visit_id: visit.visit_id,
      appointment_id: visit.appointment_id,
      visit_date: visit.visit_date,
      vital_signs: visit.vital_signs,
      diagnoses: (visit.diagnose ?? []).map((item: any) => ({
        diagnose_id: item.diagnose_id,
        diagnosis_text: item.diagnosis_text,
      })),
      treatment_plans: (visit.treatment_plan ?? []).map((item: any) => ({
        plan_id: item.plan_id,
        plan_detail: item.plan_detail,
      })),
      appointment: visit.appointments
        ? {
            appointment_id: visit.appointments.appointment_id,
            status: visit.appointments.status,
            approval_status: visit.appointments.approval_status,
            patient_id: visit.appointments.patient_id,
            patient: visit.appointments.child,
            booked_by: visit.appointments.booked_by,
            room: visit.appointments.room,
            schedule: visit.appointments.work_schedules,
          }
        : null,
      prescriptions: (visit.prescription ?? []).map((prescription: any) => ({
        prescription_id: prescription.prescription_id,
        items: (prescription.prescription_item ?? []).map((item: any) => ({
          prescription_item_id: item.prescription_item_id,
          drug_id: item.drug_id,
          quantity: item.quantity,
          drug: item.drug
            ? {
                drug_id: item.drug.drug_id,
                name: item.drug.name,
                dose: item.drug.dose,
                unit_price: item.drug.unit_price,
              }
            : null,
        })),
      })),
      invoices: (visit.invoice ?? []).map((invoice: any) => ({
        invoice_id: invoice.invoice_id,
        visit_id: invoice.visit_id,
        total_amount: invoice.total_amount,
        items: (invoice.invoice_item ?? []).map((item: any) => ({
          invoice_item_id: item.invoice_item_id,
          item_type: item.item_type,
          description: item.description,
          qty: item.qty,
          unit_price: item.unit_price,
          amount: item.amount,
          prescription_item_id: item.prescription_item_id,
          drug_name: item.prescription_item?.drug?.name ?? null,
          drug_dose: item.prescription_item?.drug?.dose ?? null,
        })),
        payments: (invoice.payment ?? []).map((payment: any) => ({
          payment_id: payment.payment_id,
          amount: payment.amount,
          payment_date: payment.payment_date,
        })),
      })),
    };
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

  private async getStaffRecord(userId: number) {
    const staff = await this.prisma.staff.findFirst({
      where: { user_id: userId },
      select: {
        staff_id: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found');
    }

    return staff;
  }

  private async getParentChildIds(userId: number) {
    const parentRecord = await this.prisma.parent.findFirst({
      where: { user_id: userId },
      include: { child_parent: true },
    });

    return parentRecord?.child_parent.map((item) => item.child_id) ?? [];
  }

  private toDayRange(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Invalid date format');
    }

    const start = new Date(`${value}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { gte: start, lt: end };
  }
}
