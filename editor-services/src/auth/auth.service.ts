import { Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {

  constructor(private users: UsersService) { }

  async validateUser(email: string, password: string) {
    email = email.toLowerCase();
    const user = await this.users.findUser(email);
    if (user && user.active && await compare(password, user.password)) {
      const { email, fullname, roles } = user;
      return { email, fullname, roles };
    }
    return null;
  }
}