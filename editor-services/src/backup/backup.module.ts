import { Module } from '@nestjs/common';
import { BackupController } from './backup.controller';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';
import { KeyValueSchema } from 'src/keyvalue-service/keyvalue.schema';
import { ActivitySchema } from 'src/activities-service/activity.schema';
import { SourceSchema } from 'src/sources-service/source.schema';
import { UserSchema } from 'src/users/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'keyvalues', schema: KeyValueSchema },
      { name: 'users', schema: UserSchema },
      { name: 'activities', schema: ActivitySchema },
      { name: 'sources', schema: SourceSchema },
    ])
  ],
  controllers: [BackupController],
})
export class BackupModule { }
