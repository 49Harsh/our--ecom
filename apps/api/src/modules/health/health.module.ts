import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator, HttpHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma as any),
    ]);
  }

  // Keep-alive endpoint for uptime monitors (UptimeRobot, cron-job.org, BetterStack, etc.)
  // Runs a real DB query so both the API and the database stay awake on free tiers.
  @Get('ping')
  @ApiOperation({ summary: 'Keep-alive ping — runs SELECT 1 against the database' })
  async ping() {
    const startedAt = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      success: true,
      status: 'ok',
      database: 'connected',
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
