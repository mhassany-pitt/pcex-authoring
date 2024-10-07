import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { KeyValue } from './keyvalue.schema';

@Injectable()
export class KeyValueService {

    constructor(
        @InjectModel('keyvalues') private kvs: Model<KeyValue>
    ) { }

    async get(user: string, key: string) {
        return await this.kvs.findOne({ user, key });
    }

    async put(user: string, key: string, value: any) {
        return await this.kvs.updateOne(
            { user, key },
            { user, key, value },
            { upsert: true }
        );
    }
}
