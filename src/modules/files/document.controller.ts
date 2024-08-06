import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
  Put,
  ParseArrayPipe,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { File, User } from '@prisma/client';
import { CaslUser, UserProxy } from '@modules/casl';
import { DocumentSearchDTO } from './dto/document-search.dto';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import { FileBaseEntity } from './entities/file-base.entity';
import Serialize from '@decorators/serialize.decorator';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { SkipThrottle } from '@nestjs/throttler';
import { ListMyDocumentsDTO } from './dto/list-my-documents.dto';
import { ListDocumentsDTO } from './dto/list-documents.dto';
import { CustomFileTypeValidator } from './validators/custom-filetype.validator';
import { RenameDocumentDto } from './dto/rename-document.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@ApiExtraModels(FileBaseEntity)
@ApiBaseResponses()
@SkipThrottle()
@Controller('documents')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly uploadService: UploadService,
  ) {}

  @ApiOperation({ summary: 'Search within documents' })
  @ApiResponse({ status: 200, description: 'Search successful' })
  @Get('/search')
  public async search(@Query() query: DocumentSearchDTO): Promise<any> {
    return this.documentService.search(query.q);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a document' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          default: [],
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @SkipThrottle({ default: false })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 4 }), //4mb
          new CustomFileTypeValidator([
            'image/png',
            'image/jpeg',
            'image/jpg',
            'application/pdf',
            'application/msword', // .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/vnd.ms-powerpoint', // .ppt
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
            'application/vnd.ms-excel', // .xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'text/plain', // .txt
          ]),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('tags', ParseArrayPipe) tags: string[],
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const tokenUser = await userProxy.get();

    console.log(file);
    console.log(tags);
    await this.uploadService.upload(file, tags, tokenUser.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents with pagination' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  // @Serialize(FileBaseEntity) TODO: Fix serializer
  async getDocuments(
    @Query() paginationDTO: ListDocumentsDTO,
  ): Promise<PaginatorTypes.PaginatedResult<File>> {
    return this.documentService.getDocuments(paginationDTO);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get your documents with pagination' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  async getMyDocuments(
    @Query() paginationDTO: ListMyDocumentsDTO,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const tokenUser = await userProxy.get();
    return this.documentService.getMyDocuments(paginationDTO, tokenUser.id);
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocumentById(@Param('documentId') documentId: string) {
    return this.documentService.getDocumentById(documentId);
  }

  @Patch(':documentId/rename')
  @ApiOperation({ summary: 'Rename a document' })
  @ApiResponse({ status: 200, description: 'Document renamed successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async renameDocument(
    @Param('documentId') documentId: string,
    @Body() renameDocumentDto: RenameDocumentDto,
  ) {
    const { originalFilename } = renameDocumentDto;
    return this.documentService.renameDocument(documentId, originalFilename);
  }

  @Patch(':documentId/public')
  @ApiOperation({ summary: 'Set Document visibility to public' })
  @ApiResponse({
    status: 200,
    description: 'Document visibility changed successfully',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async setDocumentVisibilityToPublic(@Param('documentId') documentId: string) {
    return this.documentService.setDocumentVisibilityToPublic(documentId);
  }

  @Patch(':documentId/private')
  @ApiOperation({ summary: 'Set Document visibility to private' })
  @ApiResponse({
    status: 200,
    description: 'Document visibility changed successfully',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async setDocumentVisibilityToPrivate(
    @Param('documentId') documentId: string,
  ) {
    return this.documentService.setDocumentVisibilityToPrivate(documentId);
  }

  @Delete(':documentId')
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteDocument(@Param('documentId') documentId: string) {
    return this.documentService.deleteDocument(documentId);
  }
}
