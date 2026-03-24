import { Test, TestingModule } from '@nestjs/testing';
import { ChildParentService } from './child_parent.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ChildParentService', () => {
  let service: ChildParentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChildParentService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ChildParentService>(ChildParentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
