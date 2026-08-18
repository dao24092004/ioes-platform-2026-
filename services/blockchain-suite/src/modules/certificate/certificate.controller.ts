import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  ApiResponse,
  Public,
} from '@ioes/common-node';
import { CertificateService } from './certificate.service';

@Controller('certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Post()
  @Roles('ADMIN', 'INSTRUCTOR')
  async issue(@Body() body: { userId: string; courseId: string }): Promise<ApiResponse<any>> {
    return this.certificateService.issue(body.userId, body.courseId);
  }

  @Get('verify/:tokenId')
  @Public()
  async verify(@Param('tokenId') tokenId: string): Promise<ApiResponse<any>> {
    return this.certificateService.verify(tokenId);
  }
}
