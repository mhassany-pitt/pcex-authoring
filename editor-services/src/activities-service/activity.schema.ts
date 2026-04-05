import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ActivityDocument = HydratedDocument<Activity>;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
})
export class Activity {
  @Prop() user: string;
  @Prop() published: boolean;
  @Prop() archived: boolean;
  @Prop() name: string;
  @Prop() iso_language_code: string;
  @Prop({ type: [Object] }) items: any[];
  @Prop({ type: Object }) linkings: any;
  @Prop({ type: Object }) translations: any;

  @Prop() collaborator_emails: string[];
  @Prop() created_at: Date;
  @Prop() updated_at: Date;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
