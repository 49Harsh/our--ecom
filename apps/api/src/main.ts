import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { Logger } from 'nestjs-pino';
import * as Sentry from '@sentry/nestjs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const prefix = configService.get<string>('API_PREFIX', '/api/v1');
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const adminUrl = configService.get<string>('ADMIN_URL', 'http://localhost:3001');

  // ─── Sentry ───────────────────────────────────────────────────────────────
  const sentryDsn = configService.get<string>('SENTRY_DSN');
  if (sentryDsn) {
    Sentry.init({ dsn: sentryDsn, environment: configService.get('NODE_ENV') });
  }

  // ─── Pino Logger ──────────────────────────────────────────────────────────
  app.useLogger(app.get(Logger));

  // ─── Security ─────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(compression());

  // ─── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: [frontendUrl, adminUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
  });

  // ─── Global Prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix(prefix);

  // ─── Global Pipes ─────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Global Filters ───────────────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ─── Global Interceptors ──────────────────────────────────────────────────
  app.useGlobalInterceptors(new TransformInterceptor(), new LoggingInterceptor());

  // ─── Swagger ──────────────────────────────────────────────────────────────
  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('R-Ecom API')
      .setDescription('Production-ready Clothing E-Commerce API — NestJS + Prisma + PostgreSQL')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .addTag('Auth', 'Authentication & Authorization')
      .addTag('Users', 'User management')
      .addTag('Categories', 'Product categories')
      .addTag('Products', 'Product catalog & variants')
      .addTag('Inventory', 'Stock management')
      .addTag('Uploads', 'Media uploads (Cloudinary)')
      .addTag('Cart', 'Shopping cart')
      .addTag('Coupons', 'Discount coupons')
      .addTag('Orders', 'Order management')
      .addTag('Payments', 'Razorpay payments')
      .addTag('Reviews', 'Product reviews')
      .addTag('Wishlist', 'Customer wishlist')
      .addTag('Returns', 'Return requests')
      .addTag('Notifications', 'Push & email notifications')
      .addTag('Search', 'Meilisearch product search')
      .addTag('Shipping', 'Shiprocket shipping')
      .addTag('Analytics', 'Admin analytics dashboard')
      .addTag('Dashboard', 'Hero banners & homepage sections')
      .addTag('Settings', 'App settings')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${prefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  // ─── Health & Shutdown ────────────────────────────────────────────────────
  app.enableShutdownHooks();

  await app.listen(port);
  console.log(`🚀 API running at http://localhost:${port}${prefix}`);
  console.log(`📚 Swagger docs at http://localhost:${port}${prefix}/docs`);
}

bootstrap();
