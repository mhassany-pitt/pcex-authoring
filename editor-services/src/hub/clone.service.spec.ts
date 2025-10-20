import { Test, TestingModule } from '@nestjs/testing';
import { CloneService } from './clone.service';

describe('CloneService', () => {
  let service: CloneService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CloneService],
    }).compile();

    service = module.get<CloneService>(CloneService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
