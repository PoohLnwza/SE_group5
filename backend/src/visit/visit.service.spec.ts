import { Test, TestingModule } from '@nestjs/testing';
import { VisitService } from './visit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('VisitService', () => {
  let service: VisitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<VisitService>(VisitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
