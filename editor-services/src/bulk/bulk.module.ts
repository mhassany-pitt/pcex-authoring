import { Module } from '@nestjs/common';
import { BulkController } from './bulk.controller';
import { SourcesServiceModule } from 'src/sources-service/sources-service.module';
import { CompilerServiceModule } from 'src/compiler-service/compiler-service.module';
import { ActivitiesServiceModule } from 'src/activities-service/activities-service.module';

@Module({
  controllers: [BulkController],
  imports: [SourcesServiceModule, ActivitiesServiceModule, CompilerServiceModule]
})
export class BulkModule { }
