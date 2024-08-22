import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from '../activities-service/activities.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SourcesServiceModule } from 'src/sources-service/sources-service.module';
import { ActivitiesServiceModule } from 'src/activities-service/activities-service.module';
import { CompilerServiceModule } from 'src/compiler-service/compiler-service.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [
    ActivitiesController
  ],
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ type: 'mysql', url: config.get('MYSQL_URI') }),
    }),
    ActivitiesServiceModule,
    SourcesServiceModule,
    CompilerServiceModule
  ],
  providers: [],
  exports: []
})
export class ActivitiesModule { }
