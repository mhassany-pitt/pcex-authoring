import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'users', schema: UserSchema }
    ])
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }