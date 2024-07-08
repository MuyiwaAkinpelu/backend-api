import { BadRequestException, Injectable } from '@nestjs/common';
import { FileValidator } from '@nestjs/common/pipes/file/file-validator.interface';
import { IFile } from '@nestjs/common/pipes/file/interfaces';

@Injectable()
export class CustomFileTypeValidator extends FileValidator {
  private allowedMimeTypes: string[];

  constructor(allowedMimeTypes: string[]) {
    super({});
    this.allowedMimeTypes = allowedMimeTypes;
  }

  isValid(file: IFile): boolean {
    return this.allowedMimeTypes.includes(file.mimetype);
  }

  validate(file: Express.Multer.File): boolean {
    const isValid = this.isValid(file);
    if (!isValid) {
      throw new BadRequestException(this.buildErrorMessage(file));
    }
    return isValid;
  }

  buildErrorMessage(file: IFile): string {
    return `Unsupported file type ${file.mimetype}`;
  }
}
