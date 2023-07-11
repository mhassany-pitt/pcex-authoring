import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity } from './activity.schema';
import { toObject } from 'src/utils';

@Injectable()
export class ActivitiesService {

  constructor(
    private config: ConfigService,
    @InjectModel('activities') private activities: Model<Activity>
  ) { }

  async list() {
    return (await this.activities.find()).map(toObject);
  }

  async create(model: any) {
    return await this.activities.create(model);
  }

  async read(_id: string) {
    return toObject(await this.activities.findOne({ _id }));
  }

  async update({ _id, ...model }) {
    return await this.activities.updateOne({ _id }, model);
  }

  async remove(_id: string) {
    return await this.activities.deleteOne({ _id });
  }
}