import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ApprovalRequestService } from './approval-request.service';
import { ApprovalRequest, User } from '@prisma/client';
import { ListRequestsDTO } from './dto/list-requests.dto';
import { DeclineRequestDTO } from './dto/decline-request.dto';
import { SubmitRequestDTO } from './dto/submit-request.dto';
import { CaslUser, UserProxy } from '@modules/casl';
import { ParseMongoIdPipe } from '@pipes/parse-mongoid.pipe';
import ApprovalRequestBaseEntity from './entities/approval-request-base.entity';
import { SkipThrottle } from '@nestjs/throttler';
import {
  APPROVAL_REQUEST_NOT_PENDING,
  REQUEST_NOT_FOUND,
  UNAUTHORIZED_RESOURCE,
} from '@constants/errors.constants';

@ApiTags('Approval Requests')
@ApiBearerAuth()
@ApiExtraModels(ApprovalRequestBaseEntity)
@SkipThrottle()
@Controller('approval-requests')
export class ApprovalRequestController {
  constructor(
    private readonly approvalRequestService: ApprovalRequestService,
  ) {}

  @Get('/manager')
  @ApiOperation({ summary: 'Get approval requests for a manager' })
  @ApiResponse({
    status: 200,
    description: 'Approval requests retrieved for manager',
    type: [ApprovalRequestBaseEntity],
  })
  async getApprovalRequestsForManager(
    @Query() requestsDTO: ListRequestsDTO,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const tokenUser = await userProxy.get();
    return this.approvalRequestService.listApprovalRequestsForManager(
      tokenUser.id,
      requestsDTO,
    );
  }

  @Get(':requestId')
  @ApiOperation({ summary: 'Get approval request by ID' })
  @ApiResponse({
    status: 200,
    description: 'Approval request found',
    type: ApprovalRequestBaseEntity,
  })
  @ApiResponse({ status: 404, description: 'Approval request not found' })
  async getApprovalRequestById(
    @Param('requestId', ParseMongoIdPipe) requestId: string,
  ): Promise<ApprovalRequest> {
    return this.approvalRequestService.findById(requestId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all approval requests' })
  @ApiResponse({
    status: 200,
    description: 'Approval requests retrieved',
    type: [ApprovalRequestBaseEntity],
  })
  async getAllApprovalRequests(@Query() requestsDTO: ListRequestsDTO) {
    return this.approvalRequestService.findAll(requestsDTO);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a document for approval' })
  @ApiResponse({
    status: 201,
    description: 'Document submitted for approval',
    type: ApprovalRequestBaseEntity,
  })
  @ApiResponse({ status: 404, description: 'Document or user not found' })
  @ApiResponse({ status: 409, description: 'Document already submitted' })
  async submitDocument(
    @Body() submitRequestDTO: SubmitRequestDTO,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<ApprovalRequest> {
    const tokenUser = await userProxy.get();
    const { documentId, projectId } = submitRequestDTO;
    return this.approvalRequestService.submitDocument(
      documentId,
      tokenUser.id,
      projectId,
    );
  }

  @Patch(':requestId/approve')
  @ApiOperation({ summary: 'Approve an approval request' })
  @ApiResponse({
    status: 200,
    description: 'Approval request approved',
    type: ApprovalRequestBaseEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Approval request or user not found',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not a manager of the project',
  })
  async approveRequest(
    @Param('requestId', ParseMongoIdPipe) requestId: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<ApprovalRequest> {
    const tokenUser = await userProxy.get();
    return this.approvalRequestService.approveRequest(requestId, tokenUser.id);
  }

  @Patch(':requestId/decline')
  @ApiOperation({ summary: 'Decline an approval request' })
  @ApiResponse({
    status: 200,
    description: 'Approval request declined',
    type: ApprovalRequestBaseEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Approval request or user not found',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not a manager of the project',
  })
  async declineRequest(
    @Param('requestId', ParseMongoIdPipe) requestId: string,
    @Body() declineRequestDTO: DeclineRequestDTO,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<ApprovalRequest> {
    const tokenUser = await userProxy.get();
    const { disapprovalReason } = declineRequestDTO;
    return this.approvalRequestService.declineRequest(
      requestId,
      tokenUser.id,
      disapprovalReason,
    );
  }

  @Delete(':requestId')
  @ApiOperation({ summary: 'Cancel an approval request' })
  @ApiResponse({
    status: 200,
    description: 'Approval request cancelled',
    type: ApprovalRequestBaseEntity,
  })
  @ApiResponse({
    status: 404,
    description: REQUEST_NOT_FOUND,
  })
  @ApiResponse({
    status: 400,
    description: APPROVAL_REQUEST_NOT_PENDING,
  })
  @ApiResponse({
    status: 403,
    description: UNAUTHORIZED_RESOURCE,
  })
  async cancelRequest(
    @Param('requestId') id: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<void> {
    const tokenUser = await userProxy.get();
    await this.approvalRequestService.cancelRequest(id, tokenUser.id);
  }
}
