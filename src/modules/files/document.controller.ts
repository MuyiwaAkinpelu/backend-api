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
  ParseArrayPipe,
  DefaultValuePipe,
  UploadedFiles,
  Res,
  Optional,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { UploadService } from './upload.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { DocumentVisibility, File, User } from '@prisma/client';
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
import { SkipAuth } from '@modules/auth/guard/skip-auth.guard';
import { ParseMongoIdPipe } from '@pipes/parse-mongoid.pipe';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityLogEvent } from '@modules/activity-logs/constants';

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
    private readonly eventEmitter: EventEmitter2,
  ) { }

  @ApiOperation({ summary: 'Search within publicly available documents' })
  @ApiResponse({ status: 200, description: 'Search successful' })
  @SkipAuth()
  @Get('/public-search')
  public async publicSearch(@Query() query: DocumentSearchDTO): Promise<any> {
    return this.documentService.search(query.q, DocumentVisibility.PUBLIC);
  }

  @ApiOperation({ summary: 'Search within documents' })
  @ApiResponse({ status: 200, description: 'Search successful' })
  @Get('/search')
  public async search(@Query() query: DocumentSearchDTO): Promise<any> {
    return this.documentService.search(query.q);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload documents' })
  @ApiResponse({ status: 201, description: 'Documents uploaded successfully' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          nullable: true,
          description: 'Optional MongoDB project ID',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          default: [],
          nullable: true,
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @SkipThrottle({ default: false })
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFile(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 100 }), //100mb
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
    files: Express.Multer.File[],
    @Body('tags', new DefaultValuePipe([]), ParseArrayPipe) tags: string[],
    @Optional()
    @Body(
      'projectId',
      new ParseMongoIdPipe({
        required: false,
      }),
    )
    projectId?: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const tokenUser = await userProxy.get();

    // console.log(files);
    console.log(projectId);
    if (!projectId) {
      throw new BadRequestException('Project ID is required');
    }
    await this.uploadService.upload(
      files,
      tags,
      tokenUser.id,
      tokenUser.roles,
      projectId,
    );
  }

  @Get('public')
  @SkipAuth()
  @ApiOperation({ summary: 'Get all public documents' })
  @ApiResponse({ status: 200, description: 'Public documents retrieved successfully' })
  async getPublicDocuments(
    @Query() paginationDTO: ListDocumentsDTO,
  ): Promise<PaginatorTypes.PaginatedResult<File>> {
    paginationDTO.visibility = DocumentVisibility.PUBLIC;
    return this.documentService.getDocuments(paginationDTO);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents with pagination' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  @Serialize(FileBaseEntity)
  async getDocuments(
    @Query() paginationDTO: ListDocumentsDTO,
  ): Promise<PaginatorTypes.PaginatedResult<File>> {
    return this.documentService.getDocuments(paginationDTO);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get your documents with pagination' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  @Serialize(FileBaseEntity)
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
    return this.documentService.getDocumentById(documentId, true);
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
  async deleteDocument(
    @Param('documentId') documentId: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    return this.documentService.deleteDocument(documentId, user.id);
  }

  @Get('download/:documentId')
  @ApiOperation({ summary: 'Download a document by ID' })
  @ApiResponse({ status: 200, description: 'Document downloaded successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async downloadDocument(@Param('documentId') documentId: string, @Res() res) {
    const document = await this.documentService.getDocumentById(documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const fileStream = await this.uploadService.downloadFile(document.filename);

    this.eventEmitter.emit(ActivityLogEvent.DOCUMENT_DOWNLOADED, documentId);

    res.set({
      'Content-Type': document.contentType,
      'Content-Disposition': `attachment; filename="${document.originalFilename}"`,
    });
    console.log('Starting file stream for:', documentId);


    // Handle stream errors
    fileStream.on('error', (error) => {
      console.error('S3 Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming file' });
      }
    });

    res.on('error', (error) => {
      console.error('Response stream error:', error);
    });

    res.on('close', () => {
      console.log('Response closed for:', documentId);
    });

    fileStream.pipe(res).on('finish', () => {
      console.log('Stream finished successfully for:', documentId);
    }).on('error', (error) => {
      console.error('Pipe error:', error);
    });
  }

  @Get('preview/:documentId')
  @ApiOperation({ summary: 'Download a document by ID' })
  @ApiResponse({ status: 200, description: 'Document previewed successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async previewDocument(@Param('documentId') documentId: string, @Res() res) {
    const document = await this.documentService.getDocumentById(documentId, true);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const fileStream = await this.uploadService.downloadFile(document.filename);

    res.set({
      'Content-Type': document.contentType,
      'Content-Disposition': `inline; filename="${document.originalFilename}"`,
    });
    fileStream.pipe(res);
  }
}
