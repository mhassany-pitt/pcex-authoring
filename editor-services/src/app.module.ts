import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { SourcesModule } from './sources/sources.module';
import { ActivitiesModule } from './activities/activities.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UserAdminModule } from './user-admin/user-admin.module';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { HubModule } from './hub/hub.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', 'public') }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${(process.env.NODE_ENV || 'development').toLowerCase()}`
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.get('MONGO_URI') }),
    }),
    SourcesModule,
    ActivitiesModule,
    AuthModule, UsersModule,
    UserAdminModule, HubModule,
  ],
  controllers: [AppController],
  providers: [AppService, ConfigService],
  exports: [AppService]
})
export class AppModule { }
