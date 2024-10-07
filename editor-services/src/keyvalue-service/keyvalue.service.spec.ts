import { Test, TestingModule } from '@nestjs/testing';
import { KeyValueService } from './keyvalue.service';

describe('KeyValueService', () => {
  let service: KeyValueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KeyValueService],
    }).compile();

    service = module.get<KeyValueService>(KeyValueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
