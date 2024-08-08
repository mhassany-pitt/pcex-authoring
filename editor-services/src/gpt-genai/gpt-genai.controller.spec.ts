import { Test, TestingModule } from '@nestjs/testing';
import { GptGenaiController } from './gpt-genai.controller';

describe('GptGenaiController', () => {
  let controller: GptGenaiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GptGenaiController],
    }).compile();

    controller = module.get<GptGenaiController>(GptGenaiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
