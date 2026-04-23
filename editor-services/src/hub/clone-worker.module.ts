import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivitySchema } from 'src/activities-service/activity.schema';
import { CompilerServiceModule } from 'src/compiler-service/compiler-service.module';
import { SourceSchema } from 'src/sources-service/source.schema';
import { CloneService } from './clone.service';
import { HubService } from './hub.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${(process.env.NODE_ENV || 'development').toLowerCase()}`,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.get('MONGO_URI') }),
    }),
    MongooseModule.forFeature([
      { name: 'activities', schema: ActivitySchema },
      { name: 'sources', schema: SourceSchema },
    ]),
    CompilerServiceModule,
  ],
  providers: [HubService, CloneService],
})
export class CloneWorkerModule {}
