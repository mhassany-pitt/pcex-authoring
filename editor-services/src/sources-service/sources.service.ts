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

  async list({ user, archived }) {
    const filter = { user };
    if (!archived) filter['archived'] = { $ne: true };
    return (await this.sources.find(filter)).map(toObject);
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

  async remove({ user, id: _id }): Promise<any> {
    return await this.sources.deleteOne({ user, _id });
  }

  async log({ id, log }) {
    await writeFile(
      `${this.STORAGE_PATH}/logs/${id}.log`,
      `${Date.now()} - ${JSON.stringify(log)}\n`,
      { flag: 'a' }
    );
  }
}
