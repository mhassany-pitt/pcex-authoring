import { Module } from '@nestjs/common';
import { KeyValueService } from './keyvalue.service';
import { MongooseModule } from '@nestjs/mongoose';
import { KeyValueSchema } from './keyvalue.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'keyvalues', schema: KeyValueSchema }
    ])
  ],
  providers: [KeyValueService],
  exports: [KeyValueService],
})
export class KeyValueServiceModule { }
