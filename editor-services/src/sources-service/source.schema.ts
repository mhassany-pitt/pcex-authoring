import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SourceDocument = HydratedDocument<Source>;

@Schema()
export class Source {
  @Prop() user: string;
  @Prop() archived: boolean;
  @Prop() name: string;
  @Prop() untr_name: string; // untranslated name
  @Prop() description: string;
  @Prop() untr_description: string; // untranslated description
  @Prop() tags: string[];
  @Prop() language: string;
  @Prop() filename: string;
  @Prop() code: string;
  @Prop() untr_code: string; // untranslated code
  @Prop({ type: Object }) lines: any;
  // @Prop({ type: [Object] }) variations: any[];
  @Prop({ type: [Object] }) distractors: any[];
  @Prop() programInput: string;
}

export const SourceSchema = SchemaFactory.createForClass(Source);