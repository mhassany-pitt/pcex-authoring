import { Test, TestingModule } from '@nestjs/testing';
import { SigcseService } from './sigcse.service';

describe('SigcseService', () => {
  let service: SigcseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SigcseService],
    }).compile();

    service = module.get<SigcseService>(SigcseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
