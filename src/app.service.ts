import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { join } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { promises as fsPromises } from 'fs';
import { Response } from 'express';
import * as crypto from 'crypto';
import { generateAES256Key } from './generate_dek';
import * as path from 'path';
import * as Busboy from 'busboy'; 
import * as fs from 'fs'; 



@Injectable()
export class AppService {
  private readonly uploadDir = join(__dirname, '..', 'uploads');
  private readonly algorithm = 'aes-256-cbc';
  private readonly ivLength = 16;
  private readonly masterKey: Buffer;

  constructor() {
    const keyFromEnv = process.env.MASTER_KEY || '';
    this.masterKey = Buffer.from(keyFromEnv, 'hex');

    if (this.masterKey.length !== 32) {
      throw new Error(`Invalid key length: ${this.masterKey.length} bytes`);
    }

    fsPromises.mkdir(this.uploadDir, { recursive: true });
  }

  getKey(): string {
    const key = generateAES256Key();
    return key.toString('hex');
  }

  async uploadFile(userID: string, req: Request): Promise<any> {
    return new Promise((resolve, reject) => {
        const busboy = new Busboy({ headers: req.headers });
        const userDir = join(this.uploadDir, `user_${userID}`);

        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        busboy.on('file', (fieldname, file, info) => {
            const filename = `${Date.now()}_${info.filename}.enc`;
            const filePath = join(userDir, filename);
            const iv = crypto.randomBytes(16); // 生成唯一 IV

            const writeStream = fs.createWriteStream(filePath);
            writeStream.write(iv); // 将 IV 写入文件开头

            const cipher = crypto.createCipheriv('aes-256-cbc', this.masterKey, iv);

            file.pipe(cipher).pipe(writeStream);

            writeStream.on('finish', () => {
                resolve({
                    message: 'File uploaded and encrypted successfully',
                    encryptedFilename: filename,
                });
            });

            writeStream.on('error', reject);
        });

        (req as unknown as NodeJS.ReadableStream).pipe(busboy);
    });
}


async downloadFile(userID: string, filename: string, response: Response) {
  const filePath = join(this.uploadDir, `user_${userID}`, filename);

  try {
      const fileStream = fs.createReadStream(filePath);
      fileStream.once('readable', () => {
          const iv = fileStream.read(16); // 读取 IV
          const decipher = crypto.createDecipheriv('aes-256-cbc', this.masterKey, iv);

          response.set({
              'Content-Disposition': `attachment; filename="${filename.replace('.enc', '')}"`,
              'Content-Type': 'application/octet-stream',
          });

          fileStream.pipe(decipher).pipe(response);
      });
  } catch (error) {
      throw new NotFoundException('File not found');
  }
}
}
