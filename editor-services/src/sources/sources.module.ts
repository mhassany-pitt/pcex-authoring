import { Module } from '@nestjs/common';
import { SourcesController } from './sources.controller';
import { SourcesServiceModule } from 'src/sources-service/sources-service.module';
import { CompilerServiceModule } from 'src/compiler-service/compiler-service.module';

@Module({
  controllers: [SourcesController],
  imports: [SourcesServiceModule, CompilerServiceModule],
  providers: [],
  exports: []
})
export class SourcesModule { }
