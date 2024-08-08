import { Module } from '@nestjs/common';
import { UserAdminController } from './user-admin.controller';
import { UserAdminService } from './user-admin.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  controllers: [UserAdminController],
  imports: [UsersModule],
  providers: [UserAdminService]
})
export class UserAdminModule { }
