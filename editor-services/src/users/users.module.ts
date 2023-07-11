import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'users', schema: UserSchema }
    ])
  ],
  providers: [ConfigService, UsersService],
  exports: [UsersService],
})
export class UsersModule { }