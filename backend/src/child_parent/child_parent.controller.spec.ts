import { Test, TestingModule } from '@nestjs/testing';
import { ChildParentController } from './child_parent.controller';
import { ChildParentService } from './child_parent.service';

describe('ChildParentController', () => {
  let controller: ChildParentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChildParentController],
      providers: [
        {
          provide: ChildParentService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ChildParentController>(ChildParentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
