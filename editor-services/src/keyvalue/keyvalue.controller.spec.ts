import { Test, TestingModule } from '@nestjs/testing';
import { KeyValueController } from './keyvalue.controller';

describe('KeyValueController', () => {
  let controller: KeyValueController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KeyValueController],
    }).compile();

    controller = module.get<KeyValueController>(KeyValueController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
