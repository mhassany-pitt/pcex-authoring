import { Controller, Get, NotFoundException, Req, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { Model } from 'mongoose';
import { Activity } from 'src/activities-service/activity.schema';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { KeyValue } from 'src/keyvalue-service/keyvalue.schema';
import { Source } from 'src/sources-service/source.schema';
import { User } from 'src/users/user.schema';
import { toObject, useId } from 'src/utils';

@Controller('backup')
export class BackupController {

    constructor(
        @InjectModel('keyvalues') private kvs: Model<KeyValue>,
        @InjectModel('users') private users: Model<User>,
        @InjectModel('sources') private sources: Model<Source>,
        @InjectModel('activities') private activities: Model<Activity>,
    ) { }

    @Get()
    @UseGuards(AuthenticatedGuard)
    async backup(@Req() req: any) {
        if (req.user.email == 'moh70@pitt.edu')
            return {
                keyvalues: (await this.kvs.find()).map(e => useId(toObject(e))),
                users: (await this.users.find()).map(e => useId(toObject(e))),
                sources: (await this.sources.find()).map(e => useId(toObject(e))),
                activities: (await this.activities.find()).map(e => useId(toObject(e))),
            };
        throw new NotFoundException();
    }
}
