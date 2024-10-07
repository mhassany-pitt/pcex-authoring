import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type KeyValueDocument = HydratedDocument<KeyValue>;

@Schema()
export class KeyValue {
  @Prop() user: string;
  @Prop() key: string;
  @Prop({ type: Object }) value: any;
}

export const KeyValueSchema = SchemaFactory.createForClass(KeyValue);
