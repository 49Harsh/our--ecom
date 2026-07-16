import {
  Controller, Post, Delete, Param, UseGuards,
  UseInterceptors, UploadedFile, UploadedFiles, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants/roles.constant';
import { memoryStorage } from 'multer';

@ApiTags('Uploads')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiOperation({ summary: '[Admin] Upload single image to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.uploadImage(file);
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
  @ApiOperation({ summary: '[Admin] Upload multiple images (max 10) to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    return this.uploadsService.uploadMultipleImages(files);
  }

  @Post('video')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiOperation({ summary: '[Admin] Upload video to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  uploadVideo(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.uploadVideo(file);
  }

  @Delete(':publicId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Delete media from Cloudinary by public ID' })
  deleteFile(@Param('publicId') publicId: string) {
    return this.uploadsService.deleteFile(decodeURIComponent(publicId));
  }
}
