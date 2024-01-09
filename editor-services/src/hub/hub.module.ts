import { Module } from '@nestjs/common';
import { HubController } from './hub.controller';
import { HubService } from './hub.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivitySchema } from 'src/activities-service/activity.schema';
import { CompilerServiceModule } from 'src/compiler-service/compiler-service.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: 'activities', schema: ActivitySchema }
    ]),
    CompilerServiceModule,
  ],
  controllers: [HubController],
  providers: [HubService]
})
export class HubModule { }
