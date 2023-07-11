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

  async list() {
    return (await this.sources.find()).map(toObject);
  }

  async create(model: any) {
    return await this.sources.create(model);
  }

  async read(_id: string) {
    return toObject(await this.sources.findOne({ _id }));
  }

  async update({ _id, ...model }) {
    return await this.sources.updateOne({ _id }, model);
  }

  async remove(_id: string) {
    return await this.sources.deleteOne({ _id });
  }
}
