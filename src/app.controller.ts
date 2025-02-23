import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  Req
} from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('getKey')
  async getKey(){
    return this.appService.getKey();
  }

  @Post('upload/:userID')
  async uploadFile(@Param('userID') userID: string, @Req() req: Request) {
    return this.appService.uploadFile(userID, req);
  }


  @Get('download/:userID/:filename')
    async downloadFile(
        @Param('userID') userID: string,
        @Param('filename') filename: string,
        @Res() response: Response
    ) {
        return this.appService.downloadFile(userID, filename, response);
    }

}
