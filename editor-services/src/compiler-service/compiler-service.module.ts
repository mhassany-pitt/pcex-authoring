import { Module } from '@nestjs/common';
import { ActivitiesServiceModule } from 'src/activities-service/activities-service.module';
import { SourcesServiceModule } from 'src/sources-service/sources-service.module';
import { CompilerService } from './compiler.service';

@Module({
  imports: [
    SourcesServiceModule,
    ActivitiesServiceModule
  ],
  providers: [CompilerService],
  exports: [CompilerService],
})
export class CompilerServiceModule { }
