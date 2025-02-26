import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('getKey')
  async getKey() {
    return this.appService.getKey();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.appService.uploadFile(file);
  }

  @Get('download/:userID/:filename')
  async downloadFile(
    @Param('userID') userID: string,
    @Param('filename') filename: string,
    @Res() response: Response,
  ): Promise<StreamableFile> {
    return this.appService.downloadFile(userID, filename, response);
  }
}
