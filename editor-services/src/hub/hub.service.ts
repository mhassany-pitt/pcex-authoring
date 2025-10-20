import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity } from 'src/activities-service/activity.schema';
import { Source } from 'src/sources-service/source.schema';
import { toObject, useId } from 'src/utils';

@Injectable()
export class HubService {

  constructor(
    private config: ConfigService,
    @InjectModel('activities') private activities: Model<Activity>,
    @InjectModel('sources') private sources: Model<Source>,
  ) { }

  async backup() {
    return {
      activities: (await this.activities.find()).map(e => useId(toObject(e))),
      sources: (await this.sources.find()).map(e => useId(toObject(e))),
    };
  }

  async list({ key }) {
    const filter = { published: true };
    if (key) filter['name'] = { $regex: key, $options: 'i' };
    return (await this.activities.find(filter)).map(toObject);
  }

  async getActivity(id: string) {
    return await this.activities.findOne({ _id: id });
  }

  async createActivity(model: any) {
    return await this.activities.create(model);
  }

  async getSource(id: string) {
    return await this.sources.findOne({ _id: id });
  }

  async createSource(model: any) {
    return await this.sources.create(model);
  }
}