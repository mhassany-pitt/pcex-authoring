import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { KeyValueService } from 'src/keyvalue-service/keyvalue.service';

@Controller('keyvalues')
export class KeyValueController {

    constructor(
        private service: KeyValueService,
    ) { }

    private getUserEmail(req: any) { return req.user.email; }

    @Get(':key')
    @UseGuards(AuthenticatedGuard)
    async get(@Req() req: Request, @Param('key') key: string) {
        const keyvalue = await this.service.get(this.getUserEmail(req), key);
        return { value: keyvalue?.value || null };
    }

    @Put(':key')
    @UseGuards(AuthenticatedGuard)
    async put(@Req() req: Request, @Param('key') key: string, @Body() body: any) {
        return await this.service.put(this.getUserEmail(req), key, body.value);
    }
}
