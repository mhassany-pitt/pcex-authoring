import { ConfigService } from "@nestjs/config";
import mongoose from "mongoose";
import { DataSource, QueryRunner } from "typeorm";

export const storageRoot = (config: ConfigService, ...path: string[]) => {
  return config.get('STORAGE_PATH') + (path ? '/' + path.join('/') : '');
}

export const toObject = (object) => object?.toObject();
export const useId = (object): any => {
  if (object) {
    const { __v, _id: id, ...attrs } = object;
    return ({ id: id.toString(), ...attrs })
  } else return null;
}
export const use_Id = (object): any => {
  if (object) {
    const { id: _id, ...attrs } = object;
    return ({ _id: new mongoose.Types.ObjectId(_id), ...attrs });
  } else return null;
}

export const zfill = (num: number, size: number) => {
  return '0'.repeat(size - num.toString().length) + num;
}

export const transaction = async <T>(
  dss: DataSource[],
  tryBlock: (...qrs: QueryRunner[]) => Promise<T>,
  catchBlock?: () => Promise<void>
): Promise<T> => {
  const grs: QueryRunner[] = [];
  for (const ds of dss) if (ds) {
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    grs.push(qr);
  }

  try {
    const rs = await tryBlock(...grs);
    for (const qr of grs)
      await qr.commitTransaction();
    return rs;
  } catch (err) {
    await catchBlock?.();
    for (const qr of grs)
      await qr.rollbackTransaction();
    throw err;
  } finally {
    for (const qr of grs)
      await qr.release();
  }
};
