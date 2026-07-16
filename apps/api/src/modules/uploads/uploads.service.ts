import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'products',
  ): Promise<UploadResult> {
    this.validateImageFile(file);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `recom/${folder}`,
          transformation: [
            { quality: 'auto:best', fetch_format: 'auto' },
            { width: 1200, height: 1600, crop: 'limit' },
          ],
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) return reject(new BadRequestException(error.message));
          resolve({
            url: result!.secure_url,
            publicId: result!.public_id,
            width: result!.width,
            height: result!.height,
            format: result!.format,
            bytes: result!.bytes,
          });
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async uploadMultipleImages(files: Express.Multer.File[], folder = 'products'): Promise<UploadResult[]> {
    return Promise.all(files.map((file) => this.uploadImage(file, folder)));
  }

  async uploadVideo(file: Express.Multer.File): Promise<UploadResult> {
    if (!file.mimetype.startsWith('video/')) {
      throw new BadRequestException('Only video files allowed');
    }
    if (file.size > 100 * 1024 * 1024) {
      throw new BadRequestException('Video size must be under 100MB');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'recom/videos',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) return reject(new BadRequestException(error.message));
          resolve({ url: result!.secure_url, publicId: result!.public_id });
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async deleteFile(publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  }

  private validateImageFile(file: Express.Multer.File): void {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Image size must be under 10MB');
    }
  }
}
