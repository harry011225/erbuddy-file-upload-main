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

  @Post('upload/:userId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.appService.uploadFile(file, userId);
  }

  @Get('download/:userID/:filename')
  async downloadFile(
    @Param('userID') userID: string,
    @Param('filename') filename: string,
    @Res() response: Response,
  ): Promise<void> {
    console.log(`Controller: Starting file download`);
    await this.appService.downloadFile(userID, filename, response);
  }
}
