import {
  Body, Controller, Get, HttpException,
  Patch, Post, Req, UseGuards
} from '@nestjs/common';
import { AuthenticatedGuard } from './authenticated.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { UsersService } from 'src/users/users.service';
import { compare, hash } from 'bcryptjs';

@Controller('auth')
export class AuthController {

  constructor(
    private users: UsersService,
  ) { }

  @Get('handshake')
  handshake(@Req() req: any) {
    return { user: req.user };
  }

  @Post('register')
  async register(@Body() body: any) {
    const { email, password, fullname } = body;
    const user = await this.users.findUser(email);
    if (user) throw new HttpException({ message: 'An account with this email address already exists. Please use your credentials to login.' }, 422);
    await this.users.create({ fullname, email, password: await hash(password, 10), roles: ['author'] });
    return {};
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  login(@Req() req: any) {
    return req.user;
  }

  @Patch('update-password')
  async updatePassword(@Req() req: any, @Body() body: any) {
    const { current_password, new_password, token } = body;
    const isLoggedIn = req.user;
    if (isLoggedIn) {
      const user = await this.users.findUser(req.user.email);
      console.log(user.password, current_password, await compare(current_password, user.password));
      if (user && await compare(current_password, user.password))
        await this.users.updatePassword({ email: user.email, password: new_password });
      else throw new HttpException({ message: 'Current password did not match.' }, 422);
    } else {
      const user = await this.users.findUserByResetPassToken({ token });
      if (user) await this.users.updatePassword({ email: user.email, password: new_password });
      else throw new HttpException({ message: 'Update token is invalid or expired.' }, 422);
    }
    return {};
  }

  @Post('logout')
  @UseGuards(AuthenticatedGuard)
  logout(@Req() req: any) {
    req.session.destroy();
    return {};
  }
}
