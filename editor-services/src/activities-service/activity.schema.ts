import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ActivityDocument = HydratedDocument<Activity>;

@Schema()
export class Activity {
  @Prop() user: string;
  @Prop() published: boolean;
  @Prop() archived: boolean;
  @Prop() name: string;
  @Prop({ type: [Object] }) items: any[];
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
