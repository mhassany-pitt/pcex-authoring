import { Body, Controller, Post } from '@nestjs/common';
import { ActivitiesService } from 'src/activities-service/activities.service';
import { CompilerService } from 'src/compiler-service/compiler.service';
import { SourcesService } from 'src/sources-service/sources.service';
import { toObject } from 'src/utils';

@Controller('bulk')
export class BulkController {

    constructor(
        private sources: SourcesService,
        private activities: ActivitiesService,
        private compiler: CompilerService,
    ) { }

    // @Post('sources')
    // async bulkSources(@Body() body: any) {
    //     const resp = await this.sources.create(body);
    //     const id = toObject(resp)._id;

    //     const items = [{ item$: { ...body, id: `${id}_example` }, type: 'example' }];
    //     const challenge = Object.keys(body.lines).filter(ln => body.lines[ln].blank);
    //     if (challenge) items.push({ item$: { ...body, id: `${id}_challenge` }, type: 'challenge' });
    //     this.compiler.compile({ id, name: body.name, items });

    //     return { id };
    // }

    // @Post('activities')
    // async bulkInsert(@Body() body: any) {
    //     const resp = await this.activities.create(body);
    //     const id = toObject(resp)._id;
    //     body.id = id;

    //     await this.compiler.compile(body);

    //     return { id };
    // }
}
