import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from '../activities-service/activities.service';
import { ConfigModule } from '@nestjs/config';
import { SourcesServiceModule } from 'src/sources-service/sources-service.module';
import { ActivitiesServiceModule } from 'src/activities-service/activities-service.module';
import { CompilerServiceModule } from 'src/compiler-service/compiler-service.module';

@Module({
  controllers: [ActivitiesController],
  imports: [
    ActivitiesServiceModule,
    SourcesServiceModule,
    CompilerServiceModule
  ],
  providers: [],
  exports: []
})
export class ActivitiesModule { }
