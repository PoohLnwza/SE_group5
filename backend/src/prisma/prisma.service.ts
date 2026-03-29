import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import * as bcrypt from 'bcrypt';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private _client: PrismaClient;

  constructor() {
    this._client = new PrismaClient({
      transactionOptions: {
        maxWait: 10000,
        timeout: 20000,
      },
    });
  }

  async onModuleInit() {
    await this._client.$connect();
    await this.seedAdminUser();
  }

  private async seedAdminUser() {
    // Check if any admin staff exists
    const adminRole = await this._client.roles.findUnique({
      where: { role_name: 'admin' },
    });

    if (!adminRole) {
      // Role creation is normally handled elsewhere or by migration, but just in case:
      await this._client.roles.upsert({
        where: { role_name: 'admin' },
        update: {},
        create: { role_name: 'admin' },
      });
    }

    const adminUser = await this._client.users.findUnique({
      where: { username: 'admin' },
    });

    if (!adminUser) {
      console.log('Seeding default Admin user...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('1234', salt);

      const newUser = await this._client.users.create({
        data: {
          username: 'admin',
          password_hash: passwordHash,
          user_type: 'staff',
        },
      });

      // Give them the admin role in staff table
      await this._client.staff.create({
        data: {
          first_name: 'System',
          last_name: 'Admin',
          role: 'admin',
          status: 'active',
          user_id: newUser.user_id,
        },
      });

      // Also link in user_roles
      const role = await this._client.roles.findUnique({
        where: { role_name: 'admin' },
      });
      if (role) {
        await this._client.user_roles.create({
          data: {
            user_id: newUser.user_id,
            role_id: role.role_id,
          },
        });
      }
      console.log(
        'Default Admin user created. Username: admin, Password: 1234',
      );
    }
  }

  async onModuleDestroy() {
    await this._client.$disconnect();
  }

  get $transaction() {
    return this._client.$transaction.bind(this._client);
  }
  get users() {
    return this._client.users;
  }
  get roles() {
    return this._client.roles;
  }
  get user_roles() {
    return this._client.user_roles;
  }
  get staff() {
    return this._client.staff;
  }
  get parent() {
    return this._client.parent;
  }
  get child() {
    return this._client.child;
  }
  get child_parent() {
    return this._client.child_parent;
  }
  get appointments() {
    return this._client.appointments;
  }
  get work_schedules() {
    return this._client.work_schedules;
  }
  get room() {
    return this._client.room;
  }
  get visit() {
    return this._client.visit;
  }
  get vital_signs() {
    return this._client.vital_signs;
  }
  get diagnose() {
    return this._client.diagnose;
  }
  get prescription() {
    return this._client.prescription;
  }
  get prescription_item() {
    return this._client.prescription_item;
  }
  get drug() {
    return this._client.drug;
  }
  get dispense() {
    return this._client.dispense;
  }
  get invoice() {
    return this._client.invoice;
  }
  get invoice_item() {
    return this._client.invoice_item;
  }
  get payment() {
    return this._client.payment;
  }
  get assessment() {
    return this._client.assessment;
  }
  get assessment_answer() {
    return this._client.assessment_answer;
  }
  get assessment_score_band() {
    return this._client.assessment_score_band;
  }
  get child_assessment() {
    return this._client.child_assessment;
  }
  get question() {
    return this._client.question;
  }
  get choice() {
    return this._client.choice;
  }
  get treatment_plan() {
    return this._client.treatment_plan;
  }
  get notifications() {
    return this._client.notifications;
  }
}
