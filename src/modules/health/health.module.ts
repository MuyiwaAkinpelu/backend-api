import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import HealthController from '@modules/health/health.controller';
import { CaslModule } from '@modules/casl';
import { permissions } from './health.permissions';

@Module({
  imports: [TerminusModule, CaslModule.forFeature({ permissions })],
  controllers: [HealthController],
})
export default class HealthModule {}
