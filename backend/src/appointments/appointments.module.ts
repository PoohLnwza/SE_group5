import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { PrismaModule } from '../prisma/prisma.module'; 
import { AuthModule } from '../auth/auth.module'; // <-- 1. เพิ่ม Import AuthModule

@Module({
  imports: [
    PrismaModule, 
    AuthModule // <-- 2. ใส่ AuthModule เข้าไปใน array ของ imports
  ], 
  controllers: [AppointmentsController],
  providers: [AppointmentsService]
})
export class AppointmentsModule {}