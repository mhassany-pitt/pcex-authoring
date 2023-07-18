import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Source } from './source.schema';
import { toObject } from 'src/utils';

@Injectable()
export class SourcesService {

  constructor(
    private config: ConfigService,
    @InjectModel('sources') private sources: Model<Source>,
  ) { }

  async list({ user }) {
    return (await this.sources.find({ user })).map(toObject);
  }

  async create(model: any) {
    return await this.sources.create(model);
  }

  async read({ user, id: _id }) {
    return toObject(await this.sources.findOne({ user, _id }));
  }

  async update({ user, _id, ...model }) {
    return await this.sources.updateOne({ user, _id }, model);
  }

  async remove({ user, id: _id }) {
    return await this.sources.deleteOne({ user, _id });
  }
}
