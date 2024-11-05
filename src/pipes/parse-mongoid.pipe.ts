import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isMongoId } from 'class-validator';

interface ParseMongoIdPipeOptions {
  required?: boolean;
  message?: string;
}

@Injectable()
export class ParseMongoIdPipe implements PipeTransform<string, string> {
  private readonly options: ParseMongoIdPipeOptions;

  constructor(options: ParseMongoIdPipeOptions = {}) {
    this.options = {
      required: true,
      message: 'Invalid ObjectId',
      ...options,
    };
  }

  transform(value: string): string {
    // Handle required case
    if (this.options.required && !value) {
      throw new BadRequestException('Field is required');
    }

    // Handle empty value based on nullable option
    if (!value) {
      if (this.options.required === false) {
        return undefined;
      }
      throw new BadRequestException('Value cannot be null or empty');
    }

    // Validate MongoId
    if (!isMongoId(value)) {
      throw new BadRequestException(
        `${this.options.message}: ${value} is not a valid ObjectId`,
      );
    }

    return value;
  }
}
