import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      retryStrategy: (times) => {
        if (times > 3) return null; // stop retrying after 3 attempts
        return Math.min(times * 200, 2000);
      },
      enableOfflineQueue: false, // fail fast instead of queuing
      lazyConnect: true,         // don't connect until first command
    });
  }

  async onModuleInit() {
    this.client.on('connect', () => this.logger.log('Connected to Redis ✅'));
    this.client.on('error', (err) => {
      // Log once as a warning — not as an unhandled fatal error
      this.logger.warn(`Redis unavailable (some features like OTP/2FA caching will not work): ${err.message}`);
    });
    // Try to connect but swallow failure so server still starts
    try {
      await this.client.connect();
    } catch {
      this.logger.warn('Redis not available on startup — server will continue without it.');
    }
  }

  async onModuleDestroy() {
    try { await this.client.quit(); } catch { /* ignore */ }
    this.logger.log('Redis connection closed');
  }

  // ─── Key Helpers ──────────────────────────────────────────────────────────

  async get<T = string>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async hset(key: string, field: string, value: unknown): Promise<void> {
    await this.client.hset(key, field, JSON.stringify(value));
  }

  async hget<T = unknown>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hget(key, field);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  async hgetall<T = Record<string, unknown>>(key: string): Promise<T | null> {
    const data = await this.client.hgetall(key);
    if (!data || Object.keys(data).length === 0) return null;
    const parsed: Record<string, unknown> = {};
    for (const [field, val] of Object.entries(data)) {
      try { parsed[field] = JSON.parse(val); } catch { parsed[field] = val; }
    }
    return parsed as T;
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.client.hdel(key, field);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }
}
