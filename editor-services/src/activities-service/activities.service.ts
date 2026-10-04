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

  async list({ isadmin, user, archived }) {
    const filter: any = isadmin ? {} : { $or: [{ user }, { collaborator_emails: user }] };
    if (!archived) filter['archived'] = { $ne: true };
    return (await this.activities.find(filter)).map(toObject);
  }

  async create(model: any) {
    return await this.activities.create(model);
  }

  async read({ isadmin, user, id: _id }: { isadmin?: boolean, user: string, id: string }) {
    if (isadmin) {
      return toObject(await this.activities.findOne({ _id }));
    }
    const doc = await this.activities.findOne({ $or: [{ user }, { collaborator_emails: user }], _id });
    if (doc) return toObject(doc);

    // Allow read access if this bundle is linked as a translation variation to a bundle the user has access to
    const target = await this.activities.findOne({ _id });
    if (target) {
      const translationIds = Object.values(target.translations || {}).filter(Boolean);
      const hasAccess = await this.activities.exists({
        $or: [{ user }, { collaborator_emails: user }],
        $or: [
          { _id: { $in: translationIds } },
          { 'translations.en': _id },
          { 'translations.ar': _id },
          { 'translations.es': _id },
          { 'translations.bs': _id }
        ]
      });
      if (hasAccess) {
        return toObject(target);
      }
    }
    return null;
  }

  async update({ isadmin, user, id: _id, ...model }: { isadmin?: boolean, user: string, id: string, [key: string]: any }) {
    const filter: any = isadmin ? { _id } : { $or: [{ user }, { collaborator_emails: user }], _id };
    return await this.activities.updateOne(filter, model);
  }

  async remove({ isadmin, user, id: _id }: { isadmin?: boolean, user: string, id: string }): Promise<any> {
    const filter: any = isadmin ? { _id } : { $or: [{ user }, { collaborator_emails: user }], _id };
    return await this.activities.deleteOne(filter);
  }
}
