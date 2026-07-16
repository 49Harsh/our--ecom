# Master Prompt — Clothing E-Commerce Platform (Enhanced)

You are a Senior Full Stack Software Architect with 15+ years of experience building enterprise-scale e-commerce platforms.

Your task is to build a production-ready clothing e-commerce platform similar in quality to Zara, H&M, Uniqlo, Myntra, and Snitch.

This project must follow modern software engineering practices, clean architecture, scalability, security, and maintainability.

====================================================
BUSINESS CONTEXT (answer before starting)
====================================================

Before generating architecture, confirm/assume the following and state assumptions clearly:

- Market: India-only, or India + international (affects currency, tax, shipping, language)
- Seller model: Single brand/seller (like Zara/Uniqlo) OR multi-vendor marketplace (like Myntra). Default assumption: **single seller**, unless stated otherwise.
- Expected scale at launch: approx. number of products, expected daily orders, expected concurrent users. Default assumption: **small-to-mid scale launch (under 10,000 products, under 5,000 orders/day)**, architecture should still allow scaling later.
- Primary payment currency: INR (default, since Razorpay is India-focused).

====================================================
TECH STACK
====================================================

**Frontend**
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn UI
- Framer Motion
- React Hook Form
- Zod
- React Query (TanStack Query)

**Backend**
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- **BullMQ** (background job queue — for emails, notifications, order processing, abandoned cart jobs)
- JWT Authentication
- Refresh Token
- Role Based Authorization

**Search**
- **Meilisearch** (preferred for cost/simplicity) or Elasticsearch/Algolia if scale demands it — powers autocomplete, filters, typo-tolerant search. Postgres full-text search alone is NOT sufficient at this scale.

**Storage**
- Cloudinary

**Payments**
- Razorpay (UPI, Cards, Net Banking, Wallets, Refunds, Webhooks)

**Emails**
- Resend

**SMS / OTP**
- **MSG91 or Twilio** (needed for OTP login — was missing a provider)

**Notifications**
- Firebase Cloud Messaging

**Logistics / Shipping**
- **Shiprocket or Delhivery API** integration for real rate calculation, label generation, and tracking (was missing — "shipping calculator" alone is not enough)

**Observability**
- **Sentry** (error tracking, both frontend and backend)
- **Prometheus + Grafana** (metrics/dashboards) or a simpler hosted alternative (e.g. Better Stack) if budget-constrained
- Centralized structured logging (pino/winston -> shipped to a log aggregator)

**Deployment**
- Frontend -> Vercel
- Backend -> VPS (Docker), with a plan to move to **2+ instances behind a load balancer / Nginx reverse proxy** once traffic grows (single VPS is fine for launch, but document the scale-out path)

**Database**
- PostgreSQL (with documented backup strategy — see Reliability section)

**Version Control**
- Git

====================================================
PROJECT STRUCTURE
====================================================

Use Turborepo Monorepo.

```
apps/
  website
  admin
  api
packages/
  ui
  types
  config
  utils
  eslint-config
  tsconfig
```

====================================================
BACKEND ARCHITECTURE
====================================================

Use Clean Architecture.

**Modules**
Auth, Users, Products, Categories, Orders, Coupons, Wishlist, Reviews, Payments, Analytics, Notifications, Uploads, Dashboard, **Shipping, Vendors (if multi-vendor), Search**

Every module should contain: controller, service, repository, dto, entity, guard, middleware, interceptor, validation.

====================================================
DATABASE DESIGN
====================================================

Design a highly normalized PostgreSQL database. Create complete Prisma schema.

**Tables**
Users, Addresses, Products, Categories, ProductImages, ProductVariants, Sizes, Colors, Inventory, Orders, OrderItems, Payments, Coupons, Reviews, Wishlist, Cart, HeroBanner, HomepageSections, Notifications, Returns, Transactions, ActivityLogs, Settings, Admins, Roles, Permissions, **Invoices (GST-compliant), ShippingZones, ShipmentTracking, AbandonedCarts, AuditBackups**

====================================================
PRODUCT MODEL
====================================================

Title, Slug, Description, Short Description, SKU, Barcode, Brand, Gender, Category, Subcategory, Collection, Season, Price, Discount Price, Cost Price, Stock, Weight, Images, Thumbnail, Video, Tags, Available Colors, Available Sizes, Featured, Trending, New Arrival, Best Seller, SEO Title, SEO Description, SEO Keywords, Status, CreatedAt, UpdatedAt

====================================================
PRODUCT VARIANTS
====================================================

Support multiple colors, multiple sizes, separate stock, separate SKU, separate images per variant.

====================================================
AUTHENTICATION
====================================================

Email Password, Google Login, OTP Login (via SMS provider above), Forgot Password, Refresh Token, JWT, Role Based Access (Admin, Manager, Customer).

**Add:** Admin/Manager accounts must support **2FA (TOTP)** — admin panel has access to refunds, orders, and customer data, so single-factor login is not enough.

====================================================
ADMIN PANEL
====================================================

Dashboard, Analytics, Product CRUD, Category CRUD, Coupon CRUD, Order Management, Return Requests, Inventory, Customers, Reviews, Reports, Hero Banner, Homepage Builder, Media Library, Settings, Admins, Permissions, Logs, **Shipping/Tracking Management, Invoice Management**

====================================================
CUSTOMER WEBSITE
====================================================

Home, Shop, Category, Product, Cart, Checkout, Wishlist, Orders, Profile, Addresses, Search, About, Contact, Privacy, Terms, Refund, FAQ

====================================================
HOME PAGE
====================================================

Hero Slider, Categories, New Arrivals, Trending Products, Featured Products, Best Sellers, Collections, Instagram Feed, Newsletter, Reviews

====================================================
PRODUCT PAGE
====================================================

Gallery, Zoom, Color Selector, Size Selector, Quantity, Stock Status, Related Products, Frequently Bought Together, Customer Reviews, Rating, Shipping Information, Return Policy

====================================================
SEARCH
====================================================

Implement using Meilisearch/Elasticsearch/Algolia (see Tech Stack). Autocomplete, Suggestions, Category Filter, Price Filter, Brand Filter, Color Filter, Size Filter, Gender Filter, Sort (Popularity, Newest, Price Low, Price High).

====================================================
CART
====================================================

Guest Cart, User Cart, Redis Cache, Coupon Support, Shipping Calculator (backed by real carrier API), Tax Calculation, **Abandoned Cart Recovery job (via BullMQ + email/push after X hours of inactivity)**

====================================================
CHECKOUT
====================================================

Address, Shipping Method, Payment Method, Coupon, Order Summary, Success Page

====================================================
PAYMENTS
====================================================

Razorpay integration: UPI, Cards, Net Banking, Wallets, Refund, Payment Verification, Webhook (with **signature verification** explicitly implemented and tested).

====================================================
ORDER SYSTEM
====================================================

Status: Pending, Confirmed, Packed, Shipped, Out for Delivery, Delivered, Cancelled, Returned, Refunded

**Add:** Auto-generate **GST-compliant tax invoice** (PDF) on order confirmation.

====================================================
NOTIFICATIONS
====================================================

Email, Push Notification, Order Updates, Offers, Coupons, **Abandoned cart reminders**

====================================================
SEO
====================================================

Dynamic Metadata, Open Graph, Twitter Cards, Schema.org, Sitemap, Robots.txt, Canonical URLs

====================================================
PERFORMANCE
====================================================

Image Optimization, Lazy Loading, Code Splitting, Server Components, Caching (Redis), Pagination, Infinite Scroll

====================================================
SECURITY
====================================================

Helmet, CORS, Rate Limiter (**per-role: stricter limits for guest/customer, separate limits for admin endpoints**), Validation, Password Hashing, Sanitize Inputs, Prevent SQL Injection, Prevent XSS, Prevent CSRF, **Admin 2FA**, **Webhook signature verification (Razorpay)**

====================================================
RELIABILITY & OPERATIONS (new section — was missing entirely)
====================================================

- **Database backups:** automated daily backups + point-in-time recovery plan for PostgreSQL
- **Monitoring:** Sentry for error tracking (frontend + backend), Prometheus/Grafana or hosted equivalent for infra metrics
- **Logging:** structured logs (pino/winston), centralized and searchable
- **Scale-out plan:** document path from single VPS -> multiple backend instances behind load balancer, as traffic grows
- **Secrets management:** environment variables via `.env` for dev, a proper secrets manager (e.g. Doppler, Infisical, or VPS-native vault) for production — never commit secrets

====================================================
ANALYTICS
====================================================

Dashboard: Revenue, Sales, Orders, Conversion Rate, Customers, Best Selling Products, Inventory Report

====================================================
CODE QUALITY
====================================================

Strict TypeScript, ESLint, Prettier, Reusable Components, Reusable Hooks, Reusable Services, SOLID Principles, Clean Code, Dependency Injection, Error Handling, Logging

====================================================
API DOCUMENTATION
====================================================

Swagger

====================================================
TESTING
====================================================

- Unit Tests
- Integration Tests
- **E2E Tests (Playwright)** for critical flows: signup/login, add-to-cart, checkout, payment, order tracking — these are revenue-critical paths and must not be covered by unit tests alone

====================================================
DOCKER
====================================================

Dockerize: Frontend, Backend, Postgres, Redis, Nginx

====================================================
CI/CD
====================================================

GitHub Actions: Auto Build, Auto Deploy, run test suite (unit + E2E) before deploy

====================================================
DELIVERABLES & ROADMAP
====================================================

Generate the project in phases. **Never generate everything at once. Every phase must compile/run successfully before moving to the next. Never skip a step. Explain the "why" behind each architectural decision before writing code for that phase.**

**Phase 0 — Discovery & Architecture (no code)**
1. Confirm business context assumptions (market, seller model, scale)
2. Complete software architecture document
3. Folder structure
4. Full database design + ER Diagram
5. Complete Prisma schema
6. API documentation outline (Swagger structure)
7. UI flow + wireframes for key pages

**Phase 1 — Foundation**
- Monorepo setup (Turborepo), shared packages (ui, types, config, utils, eslint-config, tsconfig)
- Docker setup for Postgres, Redis
- CI pipeline skeleton (lint + build only, no deploy yet)

**Phase 2 — Auth & Users**
- Auth module: email/password, JWT + refresh token, Google login, OTP (SMS provider), forgot password
- Admin 2FA
- Role-based guards (Admin, Manager, Customer)

**Phase 3 — Core Catalog**
- Products, Categories, ProductVariants, Sizes, Colors, Inventory modules
- Media upload (Cloudinary)
- Search indexing (Meilisearch/Elasticsearch) wired to product CRUD

**Phase 4 — Cart, Checkout, Orders**
- Cart (guest + user, Redis-backed)
- Coupons
- Checkout flow, shipping calculator (carrier API), tax calculation
- Orders + order status lifecycle
- Abandoned cart job (BullMQ)

**Phase 5 — Payments**
- Razorpay integration (UPI/cards/netbanking/wallets)
- Webhook handling with signature verification
- Refunds
- GST invoice generation on order confirmation

**Phase 6 — Post-Purchase & Engagement**
- Reviews, Wishlist, Returns
- Notifications (email via Resend, push via FCM)
- Order update notifications

**Phase 7 — Admin Dashboard**
- Full admin CRUD for all modules
- Analytics dashboard
- Homepage builder, hero banner, media library
- Permissions & activity logs
- Shipping/tracking management

**Phase 8 — Customer Website Polish**
- Home, Shop, Product, Search pages with full filter/sort
- SEO (metadata, sitemap, schema.org)
- Performance pass (image optimization, caching, code splitting)

**Phase 9 — Reliability, Security, Testing**
- Rate limiting, security headers, input sanitization audit
- Backup strategy setup, monitoring (Sentry, Prometheus/Grafana)
- Unit + integration + E2E test coverage for critical flows

**Phase 10 — Deployment**
- Dockerize all services, Nginx config
- Deploy frontend to Vercel, backend to VPS
- Full CI/CD with auto build + auto deploy gated on tests passing
- Document scale-out plan (load balancer, multi-instance backend)

Use enterprise-level coding standards. The code should be production-ready, scalable, secure, optimized, and easy to maintain.