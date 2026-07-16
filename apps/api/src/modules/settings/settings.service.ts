import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(group?: string) {
    return this.prisma.settings.findMany({ where: group ? { group } : {} });
  }

  async get(key: string) {
    return this.prisma.settings.findUnique({ where: { key } });
  }

  async set(key: string, value: unknown, group = 'general') {
    return this.prisma.settings.upsert({
      where: { key },
      update: { value: value as any },
      create: { key, value: value as any, group },
    });
  }

  async bulkSet(settings: { key: string; value: unknown; group?: string }[]) {
    await Promise.all(settings.map(s => this.set(s.key, s.value, s.group)));
    return { updated: settings.length };
  }
}
