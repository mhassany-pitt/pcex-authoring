import { Test, TestingModule } from '@nestjs/testing';
import { HubController } from './hub.controller';

describe('HubController', () => {
  let controller: HubController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HubController],
    }).compile();

    controller = module.get<HubController>(HubController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
