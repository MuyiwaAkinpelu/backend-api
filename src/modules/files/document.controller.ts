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
import { DocumentsPaginationDTO } from './dto/documents-pagination.dto';
import { MyDocumentsPaginationDTO } from './dto/my-documents-pagination.dto';
import { DeclineRequestDTO } from './dto/decline-request.dto';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import { FileBaseEntity } from './entities/file-base.entity';
import Serialize from '@decorators/serialize.decorator';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { SkipThrottle } from '@nestjs/throttler';
import { ApprovalRequestDTO } from './dto/approval-request.dto';
import {
  DOCUMENT_ALREADY_SUBMITTED,
  DOCUMENT_NOT_FOUND,
  REQUEST_NOT_FOUND,
} from '@constants/errors.constants';

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
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|pdf|doc)' }),
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
  @ApiOperation({ summary: 'Get documents with pagination' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  // @Serialize(FileBaseEntity) TODO: Fix serializer
  async getDocuments(
    @Query() paginationDTO: DocumentsPaginationDTO,
  ): Promise<PaginatorTypes.PaginatedResult<File>> {
    return this.documentService.getDocuments(paginationDTO);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get your documents with pagination' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  async getMyDocuments(
    @Query() paginationDTO: MyDocumentsPaginationDTO,
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

  @Post('/request')
  @ApiOperation({ summary: 'Request a document to be added to a project' })
  @ApiResponse({
    status: 200,
    description: 'Approval request sent successfully',
  })
  @ApiResponse({ status: 404, description: DOCUMENT_NOT_FOUND })
  @ApiResponse({ status: 409, description: DOCUMENT_ALREADY_SUBMITTED })
  async requestApproval(
    @Body() approvalRequestDTO: ApprovalRequestDTO,

    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const tokenUser = await userProxy.get();
    return this.documentService.submitDocument(
      approvalRequestDTO.documentId,
      tokenUser.id,
      approvalRequestDTO.projectId,
    );
  }

  @Post('/request/:requestId/approve')
  @ApiOperation({ summary: 'Approve a request to add a document to a project' })
  @ApiResponse({ status: 200, description: 'Request approved successfully' })
  @ApiResponse({ status: 404, description: REQUEST_NOT_FOUND })
  async approveDocument(
    @Param('requestId') requestId: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const tokenUser = await userProxy.get();
    return this.documentService.approveRequest(requestId, tokenUser.id);
  }

  @Post('/request/:requestId/decline')
  @ApiOperation({ summary: 'Disapprove a request' })
  @ApiResponse({
    status: 200,
    description: 'Request declined successfully',
  })
  @ApiResponse({ status: 404, description: REQUEST_NOT_FOUND })
  async declineRequest(
    @Param('requestId') requestId: string,
    @Body() declineRequestDTO: DeclineRequestDTO,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const tokenUser = await userProxy.get();
    const { disapprovalReason } = declineRequestDTO;
    return this.documentService.declineRequest(
      requestId,
      tokenUser.id,
      disapprovalReason,
    );
  }

  @Patch(':documentId/rename')
  @ApiOperation({ summary: 'Rename a document' })
  @ApiResponse({ status: 200, description: 'Document renamed successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async renameDocument(
    @Param('documentId') documentId: string,
    @Body() newName: string,
  ) {
    return this.documentService.renameDocument(documentId, newName);
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
