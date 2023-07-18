import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity } from 'src/activities-service/activity.schema';
import { toObject } from 'src/utils';

@Injectable()
export class HubService {

  constructor(
    private config: ConfigService,
    @InjectModel('activities') private activities: Model<Activity>
  ) { }

  async list() {
    return (await this.activities.find({ published: true })).map(toObject);
  }

  async get(id: string) {
    return await this.activities.findOne({ _id: id });
  }
}