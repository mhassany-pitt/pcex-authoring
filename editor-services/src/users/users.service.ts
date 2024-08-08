import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import { toObject } from 'src/utils';
import { hash } from 'bcryptjs';
import { compare } from 'bcryptjs';

@Injectable()
export class UsersService {

  constructor(
    @InjectModel('users') private users: Model<User>
  ) {
    this.addInitialUsers();
  }

  private async addInitialUsers() {
    const list = await this.list();
    if (list.length === 0) {
      await this.create({
        active: true,
        fullname: 'Admin',
        email: 'admin@tmp.com',
        password: await hash('admin@tmp.com', 10),
        roles: ['app-admin', 'author'],
      });
    }
  }

  async list() {
    return (await this.users.find()).map(toObject);
  }

  async listInfo() {
    return (await this.users.find()).map(toObject).map(({ _id, fullname, email }) => ({ _id, fullname, email }));
  }

  async create(model: any) {
    return await this.users.create(model);
  }

  async update(email, model: any) {
    return await this.users.updateOne({ email }, model);
  }

  async remove(emails) {
    return await this.users.deleteMany({ email: { $in: emails } });
  }

  async findUser(email: string) {
    return toObject(await this.users.findOne({ email }));
  }

  async findAPIUser(apiKey: string) {
    return toObject(await this.users.findOne({ apiKey, userType: 'api' }));
  }

  async getUsers({ userIds }) {
    return (await this.users.find({ _id: { $in: userIds } })).map(toObject);
  }

  async findUserByResetPassToken({ token }) {
    const user = await this.users.findOne({ 'reset_pass_token.token': token });
    return user && user.reset_pass_token?.expires > Date.now()
      ? toObject(user)
      : null;
  }

  async updatePassword({ email, password }) {
    return await this.users.updateOne({ email }, { password: await hash(password, 10), reset_pass_token: null });
  }
}