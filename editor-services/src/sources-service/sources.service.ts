import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Source } from './source.schema';
import { toObject } from 'src/utils';
import { ensureDirSync, writeFile } from 'fs-extra';

@Injectable()
export class SourcesService {

  STORAGE_PATH = this.config.get('STORAGE_PATH');

  constructor(
    private config: ConfigService,
    @InjectModel('sources') private sources: Model<Source>,
  ) {
    ensureDirSync(`${this.STORAGE_PATH}/logs`);
  }

  // async samples() {
  //   return {
  //     example: this.config.get('SAMPLE_EXAMPLE_URL'),
  //     challenge: this.config.get('SAMPLE_CHALLENGE_URL'),
  //   }
  // }

  db() {
    return this.sources;
  }

  async backup() {
    return (await this.sources.find()).map(toObject);
  }

  async list({ isadmin, user, archived }: { isadmin?: boolean, user: string, archived?: boolean }) {
    const filter: any = isadmin ? {} : { $or: [{ user }, { collaborator_emails: user }] };
    if (!archived) filter['archived'] = { $ne: true };
    return (await this.sources.find(filter)).map(toObject);
  }

  async create(model: any) {
    return await this.sources.create(model);
  }

  async read({ isadmin, user, id: _id }: { isadmin?: boolean, user: string, id: string }) {
    if (isadmin) {
      return toObject(await this.sources.findOne({ _id }));
    }
    const doc = await this.sources.findOne({ $or: [{ user }, { collaborator_emails: user }], _id });
    if (doc) return toObject(doc);

    // Allow read access if this source is linked as a translation variation to a source the user has access to
    const target = await this.sources.findOne({ _id });
    if (target) {
      const translationIds = Object.values(target.translations || {}).filter(Boolean);
      const hasAccess = await this.sources.exists({
        $and: [
          { $or: [{ user }, { collaborator_emails: user }] },
          {
            $or: [
              ...(translationIds.length > 0 ? [{ _id: { $in: translationIds } }] : []),
              { 'translations.en': _id },
              { 'translations.ar': _id },
              { 'translations.es': _id },
              { 'translations.bs': _id }
            ]
          }
        ]
      });
      if (hasAccess) {
        return toObject(target);
      }
    }
    return null;
  }

  async update({ isadmin, user, _id, ...model }: { isadmin?: boolean, user: string, id: string, [key: string]: any }) {
    const filter: any = isadmin ? { _id } : { $or: [{ user }, { collaborator_emails: user }], _id };
    return await this.sources.updateOne(filter, model);
  }

  async remove({ isadmin, user, id: _id }: { isadmin?: boolean, user: string, id: string }): Promise<any> {
    const filter: any = isadmin ? { _id } : { $or: [{ user }, { collaborator_emails: user }], _id };
    return await this.sources.deleteOne(filter);
  }

  async log({ id, log }) {
    await writeFile(
      `${this.STORAGE_PATH}/logs/${id}.log`,
      `${Date.now()} - ${JSON.stringify(log)}\n`,
      { flag: 'a' }
    );
  }
}
