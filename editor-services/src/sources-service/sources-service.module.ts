import { Module } from '@nestjs/common';
import { SourcesService } from './sources.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SourceSchema } from './source.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'sources', schema: SourceSchema }
    ])
  ],
  providers: [SourcesService],
  exports: [SourcesService]
})
export class SourcesServiceModule { }
