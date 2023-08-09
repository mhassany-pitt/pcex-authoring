import { PROBLEMS } from './sigcse.problems';
import { GptGenaiService } from './gpt-genai.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SigcseService {
  constructor(private service: GptGenaiService) {
    setTimeout(() => this.generate(), 1000);
  }

  private async generate() {
    const wsdir = '../../pcex-editor__storage/sigcse/explanations';
    const explanation = `When considering each identified line, ensure explanations provide the reasons that led to the line inclusion, prioritizing them based on their relative importance while also preventing any unnecessary duplication or repetition of information.`;
    for (const problem of PROBLEMS) {
      const { title, description, inclusion, exclusion, source } = problem;

      // await this.service.sleep(5000);
      console.log(title, 'withdescription-withinexclusion generating ...');
      await this.service.generate({
        skip: true,
        wsdir,
        user: title,
        source,
        id: 'withdescription-withinexclusion',
        description,
        prompt: { inclusion, exclusion, explanation },
      });

      // await this.service.sleep(5000);
      console.log(title, 'withdescription-withoutinexclusion generating ...');
      await this.service.generate({
        skip: true,
        wsdir,
        user: title,
        source,
        id: 'withdescription-withoutinexclusion',
        description,
        prompt: { inclusion: '', exclusion: '', explanation },
      });

      // await this.service.sleep(5000);
      console.log(title, 'withoutdescription-withinexclusion generating ...');
      await this.service.generate({
        skip: true,
        wsdir,
        user: title,
        source,
        id: 'withoutdescription-withinexclusion',
        description: '',
        prompt: { inclusion, exclusion, explanation },
      });

      // await this.service.sleep(5000);
      console.log(
        title,
        'withoutdescription-withoutinexclusion generating ...',
      );
      await this.service.generate({
        skip: true,
        wsdir,
        user: title,
        source,
        id: 'withoutdescription-withoutinexclusion',
        description: '',
        prompt: { inclusion: '', exclusion: '', explanation },
      });
    }
  }
}
