import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateOmiseChargeDto } from './dto/create-omise-charge.dto';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** Omise webhook — ไม่ต้องใส่ JWT guard เพราะ Omise เรียกมาเอง */
  @Post('webhook/omise')
  handleOmiseWebhook(
    @Request() req: any,
    @Body() body: any,
    @Headers('x-omise-signature') signature: string,
  ) {
    const secret = process.env.OMISE_WEBHOOK_SECRET;
    if (secret) {
      if (!signature) throw new UnauthorizedException('Missing signature');
      const rawBody = req.rawBody;
      if (!rawBody) throw new UnauthorizedException('Missing raw body');
      const expected = crypto
        .createHmac('sha1', secret)
        .update(rawBody)
        .digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }
    return this.paymentService.handleOmiseWebhook(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  createPayment(@Request() req: any, @Body() dto: CreatePaymentDto) {
    return this.paymentService.createPayment(req.user, dto);
  }

  /** Parent สร้าง PromptPay QR ผ่าน Omise */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('omise-charge')
  createOmiseCharge(@Request() req: any, @Body() dto: CreateOmiseChargeDto) {
    return this.paymentService.createOmiseCharge(req.user, dto);
  }

  /** เช็ค charge status จาก Omise */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('charge-status/:chargeId')
  getChargeStatus(@Param('chargeId') chargeId: string) {
    return this.paymentService.getChargeStatus(chargeId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('my-payments')
  getMyPayments(@Request() req: any) {
    return this.paymentService.getMyPayments(req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('invoice/:invoiceId')
  getByInvoice(@Param('invoiceId', ParseIntPipe) invoiceId: number) {
    return this.paymentService.getByInvoice(invoiceId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'psychiatrist', 'psychologist', 'nurse')
  @Get('pending')
  getPendingPayments(@Request() req: any) {
    return this.paymentService.getPendingPayments(req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'psychiatrist', 'psychologist', 'nurse')
  @Patch(':id/verify')
  confirmPayment(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.paymentService.confirmPayment(req.user, id, dto.action);
  }
}
