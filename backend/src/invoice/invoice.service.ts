import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient, item_type } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromPrescription(prescriptionId: number) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { prescription_id: prescriptionId },
      include: {
        prescription_item: {
          include: {
            drug: true,
          },
          orderBy: {
            prescription_item_id: 'asc',
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    if (!prescription.visit_id) {
      throw new BadRequestException(
        'Prescription must be linked to a visit before invoicing',
      );
    }

    if (prescription.prescription_item.length === 0) {
      throw new BadRequestException('Prescription has no items to invoice');
    }

    return this.prisma.$transaction((tx) =>
      this.syncInvoiceForVisitTx(tx, prescription.visit_id!),
    );
  }

  async getByVisit(visitId: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        visit_id: visitId,
        deleted_at: null,
      },
      include: {
        invoice_item: {
          include: {
            prescription_item: {
              include: {
                drug: true,
              },
            },
          },
          orderBy: {
            invoice_item_id: 'asc',
          },
        },
      },
      orderBy: {
        invoice_id: 'desc',
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found for this visit');
    }

    return {
      invoice_id: invoice.invoice_id,
      visit_id: invoice.visit_id,
      total_amount: invoice.total_amount,
      items: invoice.invoice_item.map((item) => ({
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
    };
  }

  async syncInvoiceForVisit(visitId: number) {
    return this.prisma.$transaction((tx) => this.syncInvoiceForVisitTx(tx, visitId));
  }

  async syncInvoiceForVisitTx(
    tx: PrismaClient | Prisma.TransactionClient,
    visitId: number,
  ) {
    const prescriptionItems = await tx.prescription_item.findMany({
      where: {
        prescription: {
          visit_id: visitId,
        },
      },
      include: {
        drug: true,
      },
      orderBy: {
        prescription_item_id: 'asc',
      },
    });

    const missingDrugPrice = prescriptionItems.find(
      (item) => !item.drug || item.drug.unit_price === null,
    );
    if (missingDrugPrice) {
      throw new BadRequestException(
        `Prescription item ${missingDrugPrice.prescription_item_id} has no priced drug`,
      );
    }

    let invoice = await tx.invoice.findFirst({
      where: {
        visit_id: visitId,
        deleted_at: null,
      },
      orderBy: {
        invoice_id: 'desc',
      },
    });

    if (!invoice && prescriptionItems.length > 0) {
      invoice = await tx.invoice.create({
        data: {
          visit_id: visitId,
          total_amount: new Prisma.Decimal(0),
        },
      });
    }

    if (!invoice) {
      throw new NotFoundException('Invoice not found for this visit');
    }

    await tx.invoice_item.deleteMany({
      where: {
        invoice_id: invoice.invoice_id,
        item_type: item_type.drug,
      },
    });

    if (prescriptionItems.length > 0) {
      await tx.invoice_item.createMany({
        data: prescriptionItems.map((item) => ({
          invoice_id: invoice!.invoice_id,
          item_type: item_type.drug,
          description: this.buildDrugDescription(item.drug?.name, item.drug?.dose),
          qty: item.quantity ?? 1,
          unit_price: item.drug!.unit_price,
          prescription_item_id: item.prescription_item_id,
        })),
      });
    }

    const invoiceItems = await tx.invoice_item.findMany({
      where: { invoice_id: invoice.invoice_id },
      include: {
        prescription_item: {
          include: {
            drug: true,
          },
        },
      },
      orderBy: {
        invoice_item_id: 'asc',
      },
    });

    const totalAmount = invoiceItems.reduce(
      (sum, item) =>
        sum.plus(item.unit_price.mul(new Prisma.Decimal(item.qty))),
      new Prisma.Decimal(0),
    );

    const updatedInvoice = await tx.invoice.update({
      where: { invoice_id: invoice.invoice_id },
      data: { total_amount: totalAmount },
    });

    return {
      invoice_id: updatedInvoice.invoice_id,
      visit_id: updatedInvoice.visit_id,
      total_amount: updatedInvoice.total_amount,
      items: invoiceItems.map((item) => ({
        invoice_item_id: item.invoice_item_id,
        item_type: item.item_type,
        description: item.description,
        qty: item.qty,
        unit_price: item.unit_price,
        amount: item.amount ?? item.unit_price.mul(new Prisma.Decimal(item.qty)),
        prescription_item_id: item.prescription_item_id,
        drug_name: item.prescription_item?.drug?.name ?? null,
        drug_dose: item.prescription_item?.drug?.dose ?? null,
      })),
    };
  }

  private buildDrugDescription(name?: string | null, dose?: string | null) {
    if (name && dose) {
      return `${name} (${dose})`;
    }

    return name || dose || 'Prescription drug';
  }
}
