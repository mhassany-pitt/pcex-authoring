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

  db() {
    return this.activities;
  }

  async backup() {
    return (await this.activities.find()).map(toObject);
  }

  async list({ user, archived }) {
    const filter = { user };
    if (!archived) filter['archived'] = { $ne: true };
    return (await this.activities.find(filter)).map(toObject);
  }

  async create(model: any) {
    return await this.activities.create(model);
  }

  async read({ user, id: _id }) {
    return toObject(await this.activities.findOne({ user, _id }));
  }

  async update({ user, id: _id, ...model }) {
    return await this.activities.updateOne({ user, _id }, model);
  }

  async remove({ user, id: _id }): Promise<any> {
    return await this.activities.deleteOne({ user, _id });
  }
}