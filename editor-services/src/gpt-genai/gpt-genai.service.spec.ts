import { Test, TestingModule } from '@nestjs/testing';
import { GptGenaiService } from './gpt-genai.service';

describe('GptGenaiService', () => {
  let service: GptGenaiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GptGenaiService],
    }).compile();

    service = module.get<GptGenaiService>(GptGenaiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
