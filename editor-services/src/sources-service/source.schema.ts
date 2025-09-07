import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SourceDocument = HydratedDocument<Source>;

@Schema()
export class Source {
  @Prop() user: string;
  @Prop() archived: boolean;
  @Prop() name: string;
  @Prop() description: string;
  @Prop() tags: string[];
  @Prop() language: string;
  @Prop() filename: string;
  @Prop() code: string;
  @Prop({ type: Object }) lines: any;
  // @Prop({ type: [Object] }) variations: any[];
  @Prop({ type: [Object] }) distractors: any[];
  @Prop() programInput: string;
}

export const SourceSchema = SchemaFactory.createForClass(Source);