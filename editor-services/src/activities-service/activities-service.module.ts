import { Module } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivitySchema } from './activity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'activities', schema: ActivitySchema }
    ])
  ],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesServiceModule { }
