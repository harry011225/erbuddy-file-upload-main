import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { join } from 'path';
import { createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import { Response } from 'express';
import * as crypto from 'crypto';
import { generateAES256Key } from './generate_dek';

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

    fs.mkdir(this.uploadDir, { recursive: true });
  }

  getKey(): string {
    const key = generateAES256Key();
    return key.toString('hex');
  }

  async uploadFile(file: Express.Multer.File) {
    // Randomly generate a userId (8-character hex string)
    const userId = crypto.randomBytes(4).toString('hex');
    // Create a directory for the user
    const userDir = join(this.uploadDir, userId);
    await fs.mkdir(userDir, { recursive: true });

    // Generate a random fileKey (16-character hex string)
    const fileKey = crypto.randomBytes(8).toString('hex');
    // Construct the final filename
    const filename = `${fileKey}_${file.originalname}`;
    const filePath = join(userDir, filename);

    // Generate IV and write it at the beginning of the file
    const iv = crypto.randomBytes(this.ivLength);

    return new Promise((resolve, reject) => {
      try {
        const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
        const writeStream = createWriteStream(filePath);

        writeStream.write(iv);

        const encrypted = Buffer.concat([
          cipher.update(file.buffer),
          cipher.final(),
        ]);

        writeStream.write(encrypted);
        writeStream.end();

        writeStream.on('finish', () => {
          resolve({ 
            message: 'File uploaded and encrypted successfully',
            userId,
            filename,
          });
        });

        writeStream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async downloadFile(
    userId: string,
    filename: string,
    response: Response & { set: any },
  ): Promise<StreamableFile> {
    const filePath = join(this.uploadDir, userId, filename);

    try {
      await fs.access(filePath);
      const fileBuffer = await fs.readFile(filePath);

      // Extract the IV and the encrypted data
      const iv = fileBuffer.slice(0, this.ivLength);
      const encryptedData = fileBuffer.slice(this.ivLength);

      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);

      response.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });

      return new StreamableFile(decrypted);
    } catch (error) {
      throw new NotFoundException('File not found');
    }
  }
}