import { Test, TestingModule } from '@nestjs/testing';
import { BulkController } from './bulk.controller';

describe('BulkController', () => {
  let controller: BulkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BulkController],
    }).compile();

    controller = module.get<BulkController>(BulkController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
