import { Module } from '@nestjs/common';
import { KeyValueController } from './keyvalue.controller';
import { KeyValueServiceModule } from '../keyvalue-service/keyvalue-service.module';

@Module({
  controllers: [KeyValueController],
  imports: [KeyValueServiceModule],
})
export class KeyValueModule { }
