import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { createWriteStream } from 'fs';
import { Response } from 'express';
import * as crypto from 'crypto';
import { generateAES256Key } from './generate_dek';
import * as fs from 'fs'; 
import { promises as fsPromises } from 'fs';


@Injectable()
export class AppService {
  private readonly uploadDir = join(__dirname, '..', 'uploads');
  private readonly algorithm = 'aes-256-cbc';
  private readonly ivLength = 16;
  private readonly masterKey: Buffer;

  constructor() {
    const keyFromEnv = process.env.MASTER_KEY || '';//read env vairable
    this.masterKey = Buffer.from(keyFromEnv, 'hex');//transfer to buffer

    if (this.masterKey.length !== 32) {
      throw new Error(`Invalid key length: ${this.masterKey.length} bytes`);
    }

    fsPromises.mkdir(this.uploadDir, { recursive: true });
  }

  getKey(): string {
    const key = generateAES256Key();
    return key.toString('hex');
  }

  async uploadFile(file: Express.Multer.File, userId: string) {
    
    // Create a directory for the user
    const userDir = join(this.uploadDir, userId);
    await fsPromises.mkdir(userDir, { recursive: true });

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
    response: Response,
  ): Promise<void> {
    const filePath = join(this.uploadDir, userId, filename);
    
    try {
      // Read the file as a stream
      const fileStream = fs.createReadStream(filePath);
  
      fileStream.once('readable', () => {
        try {
          // Read the first 16 bytes as IV
          const iv = fileStream.read(16);
          if (!iv || iv.length !== 16) throw new Error('Invalid IV');
  
          // Create AES-256-CBC decryption stream
          const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
  
          // Set response headers
          response.setHeader('Content-Type', 'application/octet-stream');
          response.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/^.*_/, '')}"`);

          //  Listen for decryption errors
          decipher.on('error', () => {
            if (!response.headersSent) response.status(500).send('Decryption failed');
          });
  
          // Handle file stream errors
          fileStream.on('error', () => {
            if (!response.headersSent) response.status(500).send('Error reading file');
          });

          // Stream decryption and send response
          fileStream.pipe(decipher).pipe(response);
          } catch (error) {
            response.status(500).send('Decryption initialization failed');
          }
        });
          
    } catch (error) {
      response.status(404).send('File not found');
    }
  }  
}