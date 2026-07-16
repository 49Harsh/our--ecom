import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants/roles.constant';

@ApiTags('Settings')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Get all settings (optionally by group)' })
  getAll(@Query('group') group?: string) {
    return this.settingsService.getAll(group);
  }

  @Get(':key')
  @ApiOperation({ summary: '[Admin] Get setting by key' })
  get(@Param('key') key: string) {
    return this.settingsService.get(key);
  }

  @Post(':key')
  @ApiOperation({ summary: '[Admin] Set a setting value' })
  set(@Param('key') key: string, @Body() body: { value: unknown; group?: string }) {
    return this.settingsService.set(key, body.value, body.group);
  }

  @Post('bulk')
  @ApiOperation({ summary: '[Admin] Bulk update multiple settings' })
  bulkSet(@Body() body: { settings: { key: string; value: unknown; group?: string }[] }) {
    return this.settingsService.bulkSet(body.settings);
  }
}
