import {
  Body, Controller, Get,
  Patch, Post, Req, UseGuards
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as EmailValidator from 'email-validator';
import { hash } from 'bcryptjs';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import sha256 from 'crypto-js/sha256';

@Controller('user-admin')
export class UserAdminController {

  constructor(private service: UsersService) { }

  private getMyEmail(req) {
    return req.user.email;
  }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async list(@Req() req) {
    const myEmail = this.getMyEmail(req);
    return (await this.service.list()).map((user: any) => {
      const { active, fullname, email, tags, roles } = user;
      const resp: any = { active, fullname, email, tags, roles };
      if (email == myEmail)
        resp.itIsMe = true;
      return resp;
    });
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Req() req, @Body() { roles, emails, tags }: any) {
    const myEmail = this.getMyEmail(req);
    const accounts = emails.split(',').map(text => {
      let [fullname, email] = text.indexOf(':') >= 0 ? text.split(':') : ['', text];
      fullname = fullname.trim();
      email = email.toLowerCase().trim();
      if (!EmailValidator.validate(email))
        return null;
      return { fullname, email };
    }).filter(user => user && user.email != myEmail);

    for (const { fullname, email } of accounts) {
      const password = await hash(Math.random().toString(), 10);
      const reset_pass_token = {
        token: sha256(Math.random().toString(36).substring(2)).toString(),
        expires: Date.now() + 60 * 60 * 1000,
      };
      await this.service.create({ fullname, email, password, tags, roles, reset_pass_token });
    }

    return {};
  }

  @Patch()
  @UseGuards(AuthenticatedGuard)
  async update(@Req() req, @Body() { action, data }: any) {
    const myEmail = this.getMyEmail(req);
    if (action == 'update') for (const user of data) {
      const { fullname, email, roles, active } = user;
      if (email == myEmail)
        continue;
      await this.service.update(email, { fullname, roles, active });
    } else if (action == 'delete') {
      await this.service.remove(data.filter(email => email != myEmail));
    } else if (action == 'update-fullname') for (const user of data) {
      const { fullname, email } = user;
      await this.service.update(email, { fullname });
    }
    return {};
  }

  @Post('update-password-tokens')
  @UseGuards(AuthenticatedGuard)
  async genUpdatePassTokens(@Req() req, @Body() emails: any) {
    const tokens = [];
    for (const email of emails) {
      const reset_pass_token = {
        token: sha256(Math.random().toString(36).substring(2)).toString(),
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      if ((await this.service.update(email, { reset_pass_token })).modifiedCount > 0)
        tokens.push({ email, ...reset_pass_token });
    }
    return tokens;
  }
}
