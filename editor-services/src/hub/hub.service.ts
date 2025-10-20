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
  ) {
    this.trim();
  }

  private async trim() {
    this.sources.find().cursor().eachAsync(async (doc) => {
      const source = useId(toObject(doc));
      const changes = {};

      if (source.tags) {
        const tags = source.tags.map((t: string) => t.trim()).filter((t: string) => t);
        source.tags = tags;
        changes['tags'] = tags;
      }

      if (source.collaborator_emails) {
        const cols = source.collaborator_emails.map((c: string) => c.trim().toLowerCase()).filter((c: string) => c);
        source.collaborator_emails = cols;
        changes['collaborator_emails'] = cols;
      }

      if (Object.keys(changes).length) {
        await this.activities.updateOne({ _id: source.id }, { $set: { ...changes } });
        console.log(`Trimmed source ${source.id}`);
      }
    });

    this.activities.find().cursor().eachAsync(async (doc) => {
      const activity = useId(toObject(doc));
      const changes = {};

      if (activity.collaborator_emails) {
        const cols = activity.collaborator_emails.map((c: string) => c.trim().toLowerCase()).filter((c: string) => c);
        activity.collaborator_emails = cols;
        changes['collaborator_emails'] = cols;
      }

      if (Object.keys(changes).length) {
        await this.activities.updateOne({ _id: activity.id }, { $set: { ...changes } });
        console.log(`Trimmed activity ${activity.id}`);
      }
    });
  }

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