import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop() active: boolean;
  @Prop() userType: string;
  @Prop() apiKey: string;
  @Prop() fullname: string;
  @Prop() email: string;
  @Prop() password: string;
  @Prop() tags: [string];
  @Prop() roles: [string];
  @Prop() permissions: [string];
  @Prop({ type: Object }) reset_pass_token: any;
}

export const UserSchema = SchemaFactory.createForClass(User);