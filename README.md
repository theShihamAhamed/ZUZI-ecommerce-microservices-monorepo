# ZUZI — E-Commerce Microservices Monorepo

A full-stack, production-grade e-commerce platform built on a microservices architecture, managed as an **Nx monorepo**. ZUZI connects **buyers**, **sellers**, and **platform administrators** through a suite of independent backend services and three dedicated Next.js frontend applications.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Services Reference](#services-reference)
  - [API Gateway](#api-gateway-port-8090)
  - [Auth Service](#auth-service-port-6001)
  - [Product Service](#product-service-port-6002)
  - [Order Service](#order-service-port-6004)
  - [Admin Service](#admin-service-port-6005)
  - [Chatting Service](#chatting-service-port-6006)
  - [Recommendation Service](#recommendation-service-port-6007)
  - [Logger Service](#logger-service-port-6008)
  - [Notification Service](#notification-service-port-6009)
  - [Kafka Service](#kafka-service-consumer-only)
- [Frontend Applications](#frontend-applications)
  - [User UI (Storefront)](#user-ui-port-3000)
  - [Seller UI (Dashboard)](#seller-ui-port-3001)
  - [Admin UI (Panel)](#admin-ui-port-3002)
- [Shared Packages](#shared-packages)
- [Data Models](#data-models)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup](#database-setup)
  - [Running the Project](#running-the-project)
- [API Reference](#api-reference)
- [Environment Variables Reference](#environment-variables-reference)
- [CI/CD](#cicd)
- [Docker Support](#docker-support)
- [Architecture Decisions](#architecture-decisions)

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                              │
│                                                                   │
│  user-ui (:3000)      seller-ui (:3001)      admin-ui (:3002)     │
└────────────────────────────┬──────────────────────────────────────┘
                             │  HTTP / WebSocket
┌────────────────────────────▼──────────────────────────────────────┐
│                       API GATEWAY (:8090)                         │
│           Rate Limiting · CORS · Reverse Proxy                    │
└──────┬──────────┬──────────┬───────────┬────────────┬────────────┘
       │          │          │           │            │
  /auth/*    /product/*  /order/*   /admin/*     /chat/*
  /notification/*    /recommendation/*
       │          │          │           │            │
┌──────▼──┐ ┌────▼────┐ ┌───▼───┐ ┌─────▼───┐ ┌─────▼──────────┐
│  Auth   │ │ Product │ │ Order │ │  Admin  │ │   Chatting     │
│ Service │ │ Service │ │Service│ │ Service │ │   Service      │
│  :6001  │ │  :6002  │ │ :6004 │ │  :6005  │ │  :6006 + WS    │
└────┬────┘ └────┬────┘ └───┬───┘ └────┬────┘ └───────┬────────┘
     │           │          │          │              │
     └──────┬────┘          │          │    ┌─────────▼──────────┐
            │               │          │    │  Recommendation    │
            │               │          │    │    Service         │
            │               │          │    │    :6007           │
            │               │          │    └────────────────────┘
            │               │          │
┌───────────▼───────────────▼──────────▼────────────────────────────┐
│                    INFRASTRUCTURE LAYER                           │
│                                                                   │
│   MongoDB (Prisma)    Redis (ioredis)    Apache Kafka (KafkaJS)   │
│         └────────────────────────────────────────┘               │
│                              │                                    │
│               ┌──────────────▼────────────────┐                  │
│               │  Kafka Service  (Consumer)     │  Notification   │
│               │  Analytics Processor           │  Service :6009  │
│               └────────────────────────────────┘                 │
└───────────────────────────────────────────────────────────────────┘
```

All client requests enter through the **API Gateway**, which applies rate limiting and CORS, then proxies to the appropriate downstream service. Backend services share a single **MongoDB** database via Prisma, use **Redis** for caching and session management, and communicate asynchronously through **Apache Kafka**.

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Monorepo Tooling** | Nx | 22.x |
| **Backend Runtime** | Node.js | 20 LTS |
| **Backend Framework** | Express.js | 4.x |
| **Frontend Framework** | Next.js (React 19) | ~16.0 |
| **Language** | TypeScript | ~5.9 |
| **Database** | MongoDB (via Prisma ORM) | Prisma 6.x |
| **Cache / Sessions** | Redis | ioredis 5.x |
| **Message Broker** | Apache Kafka | KafkaJS 2.x |
| **Real-time** | Socket.io | 4.x |
| **Authentication** | JWT + bcrypt | jsonwebtoken 9.x |
| **Payments** | Stripe | 20.x |
| **Image Storage** | ImageKit | @imagekit/nodejs 7.x |
| **File Uploads** | Multer | 2.x |
| **Machine Learning** | TensorFlow.js | 4.x |
| **Email** | Nodemailer + EJS templates | 7.x |
| **Client State** | Zustand | 5.x |
| **Server State / Fetching** | TanStack Query | 5.x |
| **UI Components** | shadcn/ui + Tailwind CSS | Tailwind 3.4 |
| **Icons** | lucide-react | 0.562 |
| **Form Validation** | react-hook-form + Zod | rhf 7.x, zod 4.x |
| **Rich Text** | react-quill-new | 3.x |
| **Build (Backend)** | Webpack + SWC | — |
| **Build (Frontend)** | Next.js + SWC | — |
| **Testing** | Jest | 30.x |
| **CI** | GitHub Actions | — |
| **Containerization** | Docker | — |

---

## Project Structure

```
ZUZI-ecommerce-microservices-monorepo/
├── apps/
│   ├── api-gateway/            # Entry point reverse-proxy (:8090)
│   ├── auth-service/           # Authentication & profiles (:6001)
│   ├── product-service/        # Products, shops, reviews (:6002)
│   ├── order-service/          # Cart, checkout, orders (:6004)
│   ├── admin-service/          # Platform admin API (:6005)
│   ├── chatting-service/       # Real-time chat + WS (:6006)
│   ├── recommendation-service/ # ML recommendations (:6007)
│   ├── logger-service/         # Logging stub (:6008)
│   ├── notification-service/   # Push notifications (:6009)
│   ├── kafka-service/          # Analytics event consumer
│   ├── user-ui/                # Next.js storefront (:3000)
│   ├── seller-ui/              # Next.js seller dashboard (:3001)
│   └── admin-ui/               # Next.js admin panel (:3002)
│
├── packages/
│   ├── components/             # Shared React UI components
│   │   ├── colorselector/
│   │   ├── custom-properties/
│   │   ├── custom-specifications/
│   │   ├── input/
│   │   ├── rich-text-editor/
│   │   └── size-selector/
│   ├── error-handler/          # Typed HTTP error classes
│   ├── libs/
│   │   ├── imageAssets/        # ImageKit URL helpers
│   │   ├── imageKit/           # ImageKit client
│   │   ├── multerConfig/       # Multer upload config
│   │   ├── prisma/             # Shared Prisma client
│   │   ├── product-pricing/    # Event & sale pricing logic
│   │   ├── redis/              # Shared Redis client
│   │   └── review-token/       # Secure review token generation
│   ├── middleware/
│   │   └── auth.middleware.ts  # Shared JWT auth middleware
│   └── utils/
│       ├── email/              # Nodemailer utility
│       └── kafka/              # Kafka client + config helpers
│
├── prisma/
│   └── schema.prisma           # Shared MongoDB schema (all models)
│
├── .env.example                # Environment variable template
├── .github/workflows/ci.yml    # GitHub Actions CI pipeline
├── nx.json                     # Nx workspace configuration
├── package.json                # Root dependencies & scripts
└── tsconfig.base.json          # Shared TypeScript config
```

---

## Services Reference

### API Gateway (port 8090)

The single entry point for all client traffic. Handles cross-cutting concerns before proxying requests downstream.

**Responsibilities:**
- Reverse proxying to all backend microservices
- Global rate limiting: **100 req/15 min** (unauthenticated), **1000 req/15 min** (authenticated)
- CORS enforcement for `localhost:3000`, `localhost:3001`, `localhost:3002`
- Cookie parsing and JSON body parsing
- Site configuration initialization on startup

**Proxy Routes:**

| Prefix | Downstream Service | Port |
|---|---|---|
| `/` | Auth Service | 6001 |
| `/product` | Product Service | 6002 |
| `/order` | Order Service | 6004 |
| `/admin` | Admin Service | 6005 |
| `/chat` | Chatting Service | 6006 |
| `/recommendation` | Recommendation Service | 6007 |
| `/notification` | Notification Service | 6009 |

Health check endpoint: `GET /gateway-health`

---

### Auth Service (port 6001)

Handles all authentication and user profile management for both **customers** and **sellers**. Exposes a Swagger UI at `/api-docs`.

**User Authentication Flow:**
1. `POST /api/user-registration` — Register; sends OTP email with activation link
2. `POST /api/verify-otp` — Verify email OTP to activate account
3. `POST /api/login-user` — Login; issues JWT access + refresh token cookies
4. `POST /api/refresh-token` — Silently rotate access token
5. `POST /api/logout` — Clear auth cookies

**Seller Authentication Flow:**
1. `POST /api/seller-registration` — Register seller; sends OTP email
2. `POST /api/seller-verify-otp` — Verify OTP
3. `POST /api/login-seller` — Login as seller
4. `POST /api/seller/shop` — Create seller shop (authenticated)
5. `POST /api/seller/stripe/connect` — Connect Stripe account for payouts
6. `GET /api/seller/status` — Check onboarding status

**Password Reset:**
- `POST /api/forgot-password` — Send reset email
- `GET /api/password-reset/verify/:token` — Verify reset token
- `POST /api/password-reset/:token` — Set new password

**Profile Management (authenticated):**
- `GET/PATCH /api/me` — Get/update profile
- `GET /api/me/addresses` — List shipping addresses
- `POST /api/me/addresses` — Add shipping address
- `PATCH /api/me/addresses/:id` — Update address
- `DELETE /api/me/addresses/:id` — Delete address
- `PATCH /api/me/addresses/:id/default` — Set default address

**Token Strategy:** JWT access tokens (short-lived) stored in HttpOnly cookies, with refresh token rotation. Both `user` and `seller` roles share the same token structure with a `role` claim.

---

### Product Service (port 6002)

The core catalogue service managing products, shops, reviews, events, and discount codes. Includes a cron job that permanently deletes soft-deleted products after a 24-hour restore window and cleans up their ImageKit assets.

**Public Endpoints:**
- `GET /api/get-products` — List all products
- `GET /api/get-filtered-products` — Filter/sort/paginate products
- `GET /api/search-products` — Full-text product search
- `GET /api/get-product/:slug` — Product detail by slug
- `GET /api/events` — Time-bounded event/flash-sale products
- `GET /api/shops` — List shops
- `GET /api/shops/:shopId` — Shop detail
- `GET /api/shops/:shopId/products` — Shop's products
- `GET /api/shops/:shopId/events` — Shop's events
- `GET /api/shops/:shopId/reviews` — Shop reviews
- `GET /api/shops/:shopId/review-summary` — Aggregated shop rating
- `GET /api/top-shops` — Top-rated shops
- `GET /api/products/:productId/reviews` — Product reviews
- `GET /api/products/:productId/review-summary` — Aggregated product rating
- `GET /api/get-categories` — Available categories

**Seller Endpoints (authenticated):**
- `POST /api/create-product` — Create product with images
- `PUT /api/update-product` — Update product
- `POST /api/delete-product` — Soft-delete product
- `PATCH /api/restore-product` — Restore within 24h window
- `GET /api/get-shop-products` — List own products
- `GET /api/seller/products/:id` — Get own product detail
- `PATCH /api/seller/products/:id` — Update own product
- `POST /api/upload-image` — Upload product image (multipart/form-data → ImageKit)
- `POST /api/delete-image` — Remove product image from ImageKit
- `POST /api/seller/events` — Create flash sale event
- `GET /api/seller/events` — List own events
- `GET /api/seller/events/:eventId` — Event detail
- `PATCH /api/seller/events/:eventId` — Update event
- `DELETE /api/seller/events/:eventId` — Delete event
- `PATCH /api/seller/events/:eventId/restore` — Restore event
- `GET/PATCH /api/seller/shop` — Get/update shop settings
- `GET /api/seller/shop/analytics` — Shop analytics
- `GET /api/seller/reviews` — Reviews for seller's products
- `PATCH /api/seller/reviews/:reviewId/reply` — Reply to a review
- `POST /api/seller/reviews/:reviewId/report` — Report a review
- `POST /api/create-discount-code` — Create discount code
- `GET /api/get-discount-codes` — List discount codes
- `DELETE /api/delete-discount-code` — Delete discount code

**Review Endpoints (authenticated):**
- `GET /api/reviews/eligibility` — Check if user can review a product
- `GET /api/reviews/requests/:code` — Get review request by secure token
- `POST /api/reviews/requests/:code/submit` — Submit review via token
- `POST /api/reviews` — Submit a review
- `PATCH /api/reviews/:reviewId` — Update own review
- `DELETE /api/reviews/:reviewId` — Delete own review
- `GET /api/my-reviews` — List own reviews

---

### Order Service (port 6004)

Manages the complete purchase lifecycle: shopping cart, Stripe checkout sessions, order creation via Stripe webhooks, and order tracking.

**Cart Endpoints (authenticated):**
- `GET /api/cart` — Get cart with product details
- `POST /api/cart/items` — Add item to cart
- `PATCH /api/cart/items` — Update item quantity
- `DELETE /api/cart/items` — Remove item from cart
- `DELETE /api/cart` — Clear entire cart
- `POST /api/cart/sync` — Sync local cart with server (post-login)
- `POST /api/cart/summary` — Preview cart totals with discount code validation

**Checkout Endpoints (authenticated):**
- `POST /api/create-payment-session` — Create Stripe Checkout Session; returns `sessionId` and `url`
- `GET /api/verifying-payment-session` — Poll session status after redirect

**Stripe Webhook:**
- `POST /api/create-order` — Receives raw Stripe events; handles `payment_intent.succeeded` to create orders, update payment records, calculate platform commissions, and trigger seller/buyer notifications

**Customer Order Endpoints (authenticated):**
- `GET /api/my-orders` — List own orders
- `GET /api/my-orders/:id` — Order detail with items and timeline

**Seller Endpoints (authenticated):**
- `GET /api/seller/orders` — List orders for own shop
- `GET /api/seller/orders/:id` — Seller order detail
- `PATCH /api/seller/orders/:id/status` — Update order status (Packed → Shipped → Delivered, etc.)
- `GET /api/seller/payments` — Payment history
- `GET /api/seller/payments/summary` — Aggregated earnings and commissions

---

### Admin Service (port 6005)

Isolated service for platform administrators. Uses its own cookie namespace — admin sessions do not share tokens with users or sellers.

**Setup (one-time):**
- `POST /api/admin/auth/setup` — Create the first admin account (requires `ADMIN_SETUP_TOKEN`). Refuses once any admin exists.

**Auth:**
- `POST /api/admin/auth/login` — Admin login
- `POST /api/admin/auth/refresh` — Refresh admin session
- `POST /api/admin/auth/logout` — Logout

**Protected Endpoints (admin authenticated):**
- `GET /api/admin/auth/me` — Current admin profile
- `GET /api/admin/dashboard/summary` — Platform-wide KPIs: total users, sellers, products, gross revenue, commission earned/pending, recent orders
- `GET /api/admin/users` / `GET /api/admin/users/:id` — User list and detail
- `GET /api/admin/sellers` / `GET /api/admin/sellers/:id` — Seller list and detail
- `GET /api/admin/products` / `GET /api/admin/products/:id` — Product list and detail
- `GET /api/admin/orders` / `GET /api/admin/orders/:id` — All platform orders
- `GET /api/admin/payments` / `GET /api/admin/payments/summary` — Payment records and totals
- `GET /api/admin/events` — Flash sale events
- `GET /api/admin/reviews` / `GET /api/admin/reviews/:reviewId` — All reviews
- `PATCH /api/admin/reviews/:reviewId/status` — Moderate review (publish / hide)
- `DELETE /api/admin/reviews/:reviewId` — Remove review

---

### Chatting Service (port 6006)

Real-time messaging between buyers and sellers, using Socket.io for delivery and Kafka for durable persistence.

**HTTP Endpoints (authenticated):**
- `GET /api/conversations` — List own conversations
- `GET /api/conversations/:id/messages` — Load message history (paginated)
- `POST /api/upload` — Upload chat image (multipart/form-data → ImageKit)

**Socket.io Events:**

| Event (emit) | Direction | Description |
|---|---|---|
| `join_conversation` | Client → Server | Join a conversation room |
| `send_message` | Client → Server | Send a text or image message |
| `typing` | Client → Server | Broadcast typing indicator |
| `mark_seen` | Client → Server | Mark messages as seen |
| `message_received` | Server → Client | Deliver incoming message |
| `message_seen` | Server → Client | Seen acknowledgement |
| `user_typing` | Server → Client | Typing indicator broadcast |
| `presence_update` | Server → Client | Online/offline status |

**Persistence Strategy:** Messages are buffered in Redis and flushed to MongoDB via a Kafka consumer every `CHAT_MESSAGE_FLUSH_INTERVAL_MS` (default 3000ms) or when the batch reaches `CHAT_MESSAGE_FLUSH_MAX_BATCH` (default 100). This decouples write throughput from socket latency.

---

### Recommendation Service (port 6007)

ML-powered product recommendations using a **hybrid TensorFlow.js model** with a weighted-baseline fallback.

**Endpoints:**
- `GET /api/recommendations` — Get personalised product recommendations (supports pagination; works for anonymous users with content-based fallback)
- `POST /api/recommendations/train` — Trigger model training for the authenticated user

**Training Pipeline:**
1. Collects the user's tracked actions from `userAnalytics` (views, cart adds, wishlist, purchases)
2. Builds a feature vocabulary from product metadata (category, subcategory, brand, shop, tags, price, ratings)
3. Constructs a binary classification training dataset (positive = interacted products, negative = sampled non-interacted)
4. Trains a dense neural network via TensorFlow.js with configurable epochs and batch size
5. Falls back to a **weighted-baseline algorithm** (scoring by interaction type weight × recency) if insufficient data or TF.js failure
6. Stores top-N recommendation IDs in `userAnalytics.recommendations` with a TTL and model version

**Minimum actions required:** configurable via `MINIMUM_TRAINING_ACTIONS` constant (default enforced internally).

---

### Logger Service (port 6008)

Placeholder service reserved for centralised structured logging integration (e.g., ELK Stack, Datadog). Currently serves a health-check response.

---

### Notification Service (port 6009)

Delivers in-app notifications to users and sellers. Consumes Kafka events for async notification creation and exposes REST endpoints for notification management.

**HTTP Endpoints:**
- `GET /api/health` — Service health
- `POST /api/internal/notifications` — Internal API for services to create notifications (protected by `NOTIFICATION_INTERNAL_TOKEN`)
- `GET /api/notifications` — List notifications for authenticated user (paginated)
- `GET /api/notifications/unread-count` — Count unread notifications
- `PATCH /api/notifications/:id/read` — Mark notification as read
- `PATCH /api/notifications/read-all` — Mark all notifications as read
- `DELETE /api/notifications/:id` — Delete a notification

**Kafka Consumer:** Listens on `NOTIFICATION_KAFKA_TOPIC` (default `notification.events`) and processes events published by the Order Service and other services to create notifications for order status changes, payment confirmations, new reviews, and more.

---

### Kafka Service (consumer only)

A standalone Kafka consumer that processes **user behaviour events** to power analytics and the recommendation engine. It does not expose an HTTP port.

**Consumed Event Actions:**

| Action | Updates |
|---|---|
| `product_view` | User analytics, product analytics (views) |
| `add_to_cart` | User analytics, product analytics (cartAdds) |
| `remove_from_cart` | User analytics, product analytics |
| `add_to_wishlist` | User analytics, product analytics (wishListAdds) |
| `remove_from_wishlist` | User analytics, product analytics |
| `shop_visit` | Shop analytics (visits, logged/guest breakdown, daily aggregates) |
| `purchase` | Product analytics (purchases) |

**Reliability:** Exponential backoff reconnection (`5s → 60s max`), event queue with 3-second flush interval, and graceful shutdown on `SIGINT`/`SIGTERM`.

---

## Frontend Applications

### User UI (port 3000)

A Next.js 16 (App Router) customer-facing storefront.

**Pages & Routes:**

| Route | Description |
|---|---|
| `/` | Home with hero banner and personalised suggested products |
| `/products` | Filterable, paginated product listing |
| `/product/[slug]` | Full product detail with gallery, variants, reviews |
| `/offers` | Flash sale / event product listing |
| `/shops` | Browse all shops |
| `/shops/[shopId]` | Shop detail with products and reviews |
| `/cart` | Shopping cart management |
| `/checkout` | Stripe-powered checkout |
| `/checkout/success` | Post-payment confirmation |
| `/wishlist` | Saved products |
| `/profile` | User profile overview |
| `/profile/orders` | Order history |
| `/profile/orders/[orderId]` | Order detail with delivery timeline |
| `/reviews/submit/[code]` | Secure review submission via token |
| `/(auth)/login` | Login with email/password or Google OAuth |
| `/(auth)/sign-up` | Registration with OTP email verification |
| `/(auth)/forgot-password` | Password reset request |
| `/(auth)/reset-password/[token]` | Set new password |
| `/(auth)/verify-email` | Email verification / OTP entry |

**Key Features:**
- Google OAuth sign-in button
- Product quick-preview modal
- Real-time cart sync (Zustand store → server on login)
- Chat panel to message sellers directly from the product page
- WebSocket provider for real-time notifications and chat
- Device and location tracking for analytics events
- Recommendation-driven "Suggested Products" and "You May Also Like" sections
- Filterable sidebar (category, price range, rating, brand)
- Emoji picker and image upload in chat
- Shipping address management (add, edit, set default)
- Review management (view, edit, delete own reviews)
- Notification centre with unread badge

---

### Seller UI (port 3001)

A Next.js seller dashboard for shop management, built with shadcn/ui and Tailwind CSS.

**Dashboard Pages:**

| Route | Description |
|---|---|
| `/dashboard` | Sales overview, analytics |
| `/dashboard/orders` | Order list with status |
| `/dashboard/orders/[orderId]` | Order detail and status update |
| `/dashboard/payments` | Payment history and earnings summary |
| `/dashboard/reviews` | Customer reviews with reply / report |
| `/dashboard/create-product` | Rich product creation form |
| `/dashboard/products` | Product list (active, pending, draft) |
| `/dashboard/products/[productId]/edit` | Edit product |
| `/dashboard/discount-codes` | Manage discount codes |
| `/dashboard/create-event` | Create a time-bounded flash sale |
| `/dashboard/events` | Event list |
| `/dashboard/events/[eventId]/edit` | Edit event |
| `/dashboard/inbox` | Conversation list |
| `/dashboard/inbox/[conversationId]` | Real-time chat thread |
| `/dashboard/notifications` | Notification centre |
| `/dashboard/settings` | Shop profile and settings |
| `/(auth)/login` | Seller login |
| `/(auth)/sign-up` | Seller registration + shop setup |
| `/stripe/success` | Stripe Connect onboarding success |

**Key Features:**
- Full product builder with ImageKit image uploads, color/size selectors, custom properties, custom specifications, and rich text description
- Event/flash-sale pricing: event price must be lower than the normal sale price (validated client-side and server-side)
- Order status workflow with a configurable timeline
- Integrated chat inbox with real-time WebSocket messaging
- Shop analytics dashboard (visit trends, logged-in vs guest)
- Responsive sidebar navigation with Lucide icons
- Debounced search inputs

---

### Admin UI (port 3002)

A Next.js admin control panel for platform management.

**Pages:**

| Route | Description |
|---|---|
| `/dashboard` | Platform KPIs (users, sellers, revenue, commissions) |
| `/users` | User management |
| `/sellers` | Seller management |
| `/products` | Product oversight |
| `/orders` | All platform orders |
| `/payments` | Payment records and summaries |
| `/reviews` | Review moderation (publish, hide, delete) |
| `/events` | Flash sale overview |
| `/management` | Platform management settings |
| `/customization` | (Placeholder) Platform customization |
| `/notifications` | (Placeholder) Admin notifications |
| `/loggers` | (Placeholder) Log viewer |
| `/login` | Admin login (isolated auth) |

---

## Shared Packages

All packages under `packages/` are importable by any app via TypeScript path aliases.

| Package | Import Path | Description |
|---|---|---|
| Error Handler | `@error-handler/...` | Typed error classes: `AppError`, `NotFoundError`, `ValidationError`, `AuthError`, `ForbiddenError`, `DatabaseError`, `RateLimitError` |
| Auth Middleware | `@middleware/auth.middleware` | `isAuthenticated` — verifies JWT from cookie or `Authorization` header, attaches `req.user` and `req.role` |
| Prisma Client | `@libs/prisma` | Shared singleton Prisma client connected to MongoDB |
| Redis Client | `@libs/redis` | Shared ioredis instance with connection logging |
| ImageKit Client | `@libs/imageKit` | Shared ImageKit SDK client |
| Image Assets | `@libs/imageAssets` | Helper for constructing ImageKit URLs with transformations |
| Multer Config | `@libs/multerConfig` | Pre-configured multer middleware for product image uploads |
| Product Pricing | `@libs/product-pricing` | Pure functions: `getProductEffectivePricing`, `getProductEventStatus`, `validateEventSalePrice` — shared across backend and frontend |
| Review Token | `@libs/review-token` | `generateReviewRequestToken`, `hashReviewRequestToken`, `parseReviewRequestCode` — cryptographic review invitation tokens |
| Kafka Utils | `@packages/utils/kafka` | Kafka client factory, broker config helpers, `isKafkaEnabled` flag |
| Email Utils | `@packages/utils/email` | Nodemailer send-mail wrapper |
| React Components | `@packages/components/*` | Shared form components: `ColorSelector`, `CustomProperties`, `CustomSpecifications`, `Input`, `RichTextEditor`, `SizeSelector` |

---

## Data Models

All models are defined in `/prisma/schema.prisma` targeting MongoDB.

### User Domain

| Model | Key Fields |
|---|---|
| `user` | `id`, `email`, `name`, `password?`, `following[]`, `avatar?`, `shippingAddresses[]` |
| `shippingAddress` | `userId`, `fullName`, `phone`, `addressLine1-2`, `city`, `state`, `postalCode`, `country`, `isDefault` |
| `cart` | `userId (unique)`, `items[]` (embedded `cartItem` type with `productId`, `quantity`, `selectedOptions`, `selectedOptionsKey`) |

### Seller Domain

| Model | Key Fields |
|---|---|
| `seller` | `id`, `email`, `name`, `password`, `phone_number`, `country`, `avatar?`, `stripeId?`, `status` (PENDING → EMAIL_VERIFIED → SHOP_CREATED → ACTIVE) |
| `shop` | `sellerId (unique)`, `name`, `bio`, `category`, `avatar`, `coverBanner`, `address`, `opening_hours`, `socialLinks[]`, `ratings`, `reviewCount` |
| `site_configs` | `categories[]`, `subCategories (Json)` |
| `discount_codes` | `publicName`, `discountType`, `discountValue`, `discountCode (unique)`, `sellerId` |

### Product Domain

| Model / Enum | Key Fields |
|---|---|
| `products` | `title`, `slug (unique)`, `category`, `subCategory`, `images[]`, `tags[]`, `brand?`, `colors[]`, `sizes[]`, `stock`, `sale_price`, `regular_price`, `isEvent`, `event_sale_price?`, `starting_date?`, `ending_date?`, `status` (Active / Pending / Draft), `isDeleted`, `deletedAt`, `custom_specifications`, `custom_properties` |
| `productReview` | `productId`, `userId`, `orderId`, `orderItemId (unique)`, `sellerId`, `rating`, `title?`, `comment?`, `status` (Published / Hidden / Reported / Deleted), `sellerReply?` |
| `reviewRequest` | `publicId`, `tokenHash (unique)`, `status` (Pending / Used / Expired / Revoked), `expiresAt` |

### Order Domain

| Model / Enum | Key Fields |
|---|---|
| `orders` | `orderNumber?`, `orderGroupId?`, `userId`, `shopId`, `sellerId`, `sessionId`, `paymentIntentId`, `couponCode?`, `subtotal`, `discountAmount`, `total`, `status` (Ordered → Packed → Paid → Processing → Shipped → OutForDelivery → Delivered → Cancelled → Refunded), `statusHistory[]` |
| `orderItems` | `orderId`, `productId`, `title`, `imageUrl`, `quantity`, `unitPrice`, `total`, `selectedOptions` |
| `orderPayment` | `sessionId (unique)`, `paymentIntentId (unique)`, `subtotal`, `discountAmount`, `total`, `currency`, `paymentStatus` (Pending / Succeeded / Failed / Refunded) |
| `platformCommission` | `orderId (unique)`, `sellerId`, `shopId`, `commissionRate`, `commissionBase`, `commissionAmount`, `sellerReceivableAmount`, `status` (Pending / Earned / Reversed / Refunded) |

### Chat Domain

| Model / Enum | Key Fields |
|---|---|
| `conversation` | `conversationKey (unique)`, `userId`, `sellerId`, `shopId?`, `productId?`, `lastMessageText?`, `lastMessageAt?`, `userUnreadCount`, `sellerUnreadCount` |
| `chatMessage` | `clientMessageId (unique)`, `conversationId`, `senderId`, `senderType` (user / seller), `content?`, `attachments[]`, `status` (Sent / Delivered / Seen) |

### Analytics Domain

| Model | Key Fields |
|---|---|
| `userAnalytics` | `userId (unique)`, `actions[]` (embedded — action, productId, shopId, city, device, createdAt), `recommendations[]`, `recommendationsLastTrained?`, `recommendationModelVersion?` |
| `productAnalytics` | `productId (unique)`, `shopId?`, `views`, `cartAdds`, `wishListAdds`, `purchases` |
| `shopAnalytics` | `shopId (unique)`, `totalVisits`, `loggedInVisits`, `guestVisits` |
| `shopDailyAnalytics` | `shopId + date (unique)`, `totalVisits`, `loggedInVisits`, `guestVisits` |

### Other Models

| Model | Key Fields |
|---|---|
| `admin` | `email (unique)`, `name`, `password`, `role` (SUPER_ADMIN / ADMIN), `status` (ACTIVE / DISABLED) |
| `notifications` | `recipientId`, `recipientType`, `title`, `message`, `redirectUrl?`, `type`, `isRead`, `dedupeKey?` |

---

## Key Features

### Authentication & Authorisation
- **Three isolated role types:** customer, seller, admin — each with dedicated login flows and cookie namespaces
- **JWT access + refresh token pair** stored in HttpOnly cookies; refresh rotation prevents replay attacks
- **OTP email verification** for new user and seller registrations (EJS-templated emails via Nodemailer)
- **Forgot/reset password** flow with time-limited tokens
- **Google OAuth** sign-in for customers
- **Seller onboarding state machine:** PENDING → EMAIL_VERIFIED → SHOP_CREATED → ACTIVE
- **Admin bootstrap:** first admin created via a one-time setup token; subsequent setup attempts are rejected

### Product Catalogue
- Rich product data: images (multiple, ImageKit), video URL, tags, brand, category/subcategory, colors, sizes, custom properties and specifications (JSON), warranty, short/detailed descriptions (rich text)
- **Soft delete with 24-hour restore window** — a cron job permanently deletes products and their ImageKit assets after the window expires
- **Flash sale events** with start/end dates; event price must be lower than normal sale price (enforced by the shared `product-pricing` library)
- Three product statuses: **Active**, **Pending**, **Draft**
- Full-text search and multi-dimensional filtering (category, price, rating, brand, stock)

### Shopping & Checkout
- **Server-side cart persistence** (MongoDB) with local Zustand store for instant UI updates
- Cart sync endpoint for merging guest cart on login
- Discount code validation at cart summary time
- **Stripe Checkout Session** for payment; order creation driven by `payment_intent.succeeded` webhook (raw body preserved for signature verification)
- Platform commission automatically calculated and recorded on each order (configurable rate via `PLATFORM_COMMISSION_RATE`)
- Order status history with timestamps; sellers can progress status through the workflow

### Real-time Chat
- Socket.io rooms per conversation; presence tracked in Redis with configurable TTL
- Message delivery status: Sent → Delivered → Seen
- Kafka-backed persistence with Redis buffer batching (configurable flush interval and batch size)
- Image attachment support via ImageKit upload
- Emoji picker integration

### ML Recommendations
- **Hybrid model:** TensorFlow.js neural network (75%) + weighted-baseline fallback (25%)
- Feature vector includes: one-hot encoded category, subcategory, brand, shop, top tags + normalised price, review count, total sales
- Positive samples from user interactions; negative samples randomly drawn from non-interacted products
- Cached recommendation IDs stored in `userAnalytics` with configurable TTL and model version tracking
- Degrades gracefully: if TF.js training fails or insufficient data exists, falls back to pure weighted-baseline scoring
- Anonymous users receive content-based / popularity fallback

### Review System
- Eligibility-gated: only purchasers can review; checked against order history
- **Secure review tokens** (publicId.secret format, SHA-256 hashed server-side) sent post-delivery with configurable 30-day expiry
- Review request status lifecycle: Pending → Used / Expired / Revoked
- Seller reply and report functionality
- Admin moderation: publish, hide, or delete reviews
- Rating aggregation on both product and shop level

### Analytics
- User behaviour events published to Kafka from the user-ui (product views, cart events, wishlist events, shop visits, purchases)
- Analytics service consumes and aggregates into `userAnalytics`, `productAnalytics`, `shopAnalytics`, and `shopDailyAnalytics`
- Device detection (`ua-parser-js`) and geolocation tracking on events
- Seller-facing shop analytics dashboard showing visit trends and login/guest breakdowns

### Notifications
- Notification service consumes Kafka events for order confirmations, status changes, and review requests
- Internal API allows other services to push notifications directly
- Unread count badge and mark-read/mark-all-read functionality
- Deduplication support via `dedupeKey` field

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS | Runtime |
| npm | 10+ | Package manager |
| MongoDB | 6+ | Database (local or Atlas) |
| Redis | 7+ | Cache and session store |
| Apache Kafka | 3+ | Event streaming (optional for development) |
| Stripe CLI | Latest | Webhook forwarding in local dev |

> **Kafka is optional in development.** Set `KAFKA_ENABLED=false` in your `.env` to run without it. Use the `dev:no-kafka` script to exclude the kafka-service from the process group.

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ZUZI-ecommerce-microservices-monorepo.git
cd ZUZI-ecommerce-microservices-monorepo

# Install all dependencies
npm install
```

### Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Open and fill in the required values (see Environment Variables Reference below)
nano .env
```

At minimum, configure:
- `DATABASE_URL` — MongoDB connection string
- `REDIS_DATABASE_URI` — Redis connection string
- `SMTP_*` — Email credentials for OTP and password-reset emails
- `REGISTRATION_SECRET`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` — JWT secrets (use strong random strings)
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` — from the Stripe Dashboard
- `IMAGEKIT_PRIVATE_KEY` — from the ImageKit Dashboard
- `ADMIN_SETUP_TOKEN`, `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` — for first admin bootstrap

### Database Setup

```bash
# Generate the Prisma client from the schema
npx prisma generate

# Push the schema to MongoDB (creates collections and indexes)
npx prisma db push
```

### Running the Project

**Development — all services:**
```bash
npm run dev
```

**Development — without Kafka (recommended for local dev):**
```bash
npm run dev:no-kafka
```

**Individual services:**
```bash
# Backend services
npx nx serve api-gateway
npx nx serve auth-service
npx nx serve product-service
npx nx serve order-service
npx nx serve admin-service
npx nx serve chatting-service
npx nx serve recommendation-service
npx nx serve notification-service
npx nx serve kafka-service

# Frontend apps
npm run user-ui        # http://localhost:3000
npm run seller-ui      # http://localhost:3001
npm run admin-ui       # http://localhost:3002
```

**Stripe webhook forwarding (local development):**
```bash
stripe listen --forward-to http://localhost:8090/order/api/create-order
```

**Generate API documentation:**
```bash
npm run auth-docs     # Regenerates apps/auth-service/src/swagger-output.json
npm run product-docs  # Regenerates apps/product-service/src/swagger-output.json
```

**Bootstrap the first admin:**
```bash
curl -X POST http://localhost:8090/admin/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Platform Admin",
    "email": "admin@yourdomain.com",
    "password": "StrongPassword123!",
    "setupToken": "your-ADMIN_SETUP_TOKEN-value"
  }'
```

**Build for production:**
```bash
npx nx run-many -t build --all
```

**Run tests:**
```bash
npx nx run-many -t test --all
```

**Visualise the project dependency graph:**
```bash
npx nx graph
```

---

## API Reference

All requests go through the API Gateway on port `8090`. Prefix paths with the gateway proxy path.

| Service | Base URL via Gateway |
|---|---|
| Auth Service | `http://localhost:8090/api/...` |
| Product Service | `http://localhost:8090/product/api/...` |
| Order Service | `http://localhost:8090/order/api/...` |
| Admin Service | `http://localhost:8090/admin/api/...` |
| Chat Service | `http://localhost:8090/chat/api/...` |
| Recommendation Service | `http://localhost:8090/recommendation/api/...` |
| Notification Service | `http://localhost:8090/notification/api/...` |

**Swagger UI** (Auth Service only): `http://localhost:6001/api-docs`

Authentication is passed via the `access_token` HttpOnly cookie set at login, or as an `Authorization: Bearer <token>` header.

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | ✅ | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/zuzi` |
| `REDIS_DATABASE_URI` | ✅ | Redis connection URI | `redis://localhost:6379` |
| `SMTP_HOST` | ✅ | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | ✅ | SMTP port | `587` |
| `SMTP_SERVICE` | ✅ | Email service name | `gmail` |
| `SMTP_USER` | ✅ | SMTP username / email | `noreply@yourdomain.com` |
| `SMTP_PASS` | ✅ | SMTP password / app password | `app-specific-password` |
| `REGISTRATION_SECRET` | ✅ | Secret for registration token signing | random 64-char string |
| `ACCESS_TOKEN_SECRET` | ✅ | JWT access token secret | random 64-char string |
| `REFRESH_TOKEN_SECRET` | ✅ | JWT refresh token secret | random 64-char string |
| `STRIPE_SECRET_KEY` | ✅ | Stripe API secret key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret | `whsec_...` |
| `CLIENT_URL` | ✅ | Public URL of the user storefront | `http://localhost:3000` |
| `IMAGEKIT_PRIVATE_KEY` | ✅ | ImageKit private API key | `private_...` |
| `KAFKA_ENABLED` | ✅ | Enable/disable Kafka (`true`/`false`) | `false` |
| `KAFKA_BROKER` | ⬜ | Kafka broker connection string | `pkc-xxx.us-east1.gcp.confluent.cloud:9092` |
| `KAFKA_API_KEY` | ⬜ | Kafka SASL username | `your-api-key` |
| `KAFKA_API_SECRET` | ⬜ | Kafka SASL password | `your-api-secret` |
| `KAFKA_ANALYTICS_ENABLED` | ⬜ | Enable analytics Kafka topic | `true` |
| `CHAT_SERVICE_URL` | ⬜ | Chat service internal URL | `http://localhost:6006` |
| `CHAT_KAFKA_TOPIC` | ⬜ | Kafka topic for chat messages | `chat.new_message` |
| `CHAT_KAFKA_GROUP_ID` | ⬜ | Consumer group for chat messages | `chat-message-db-writer` |
| `CHAT_MESSAGE_FLUSH_INTERVAL_MS` | ⬜ | Chat Redis→DB flush interval (ms) | `3000` |
| `CHAT_MESSAGE_FLUSH_MAX_BATCH` | ⬜ | Max messages per flush batch | `100` |
| `CHAT_PRESENCE_TTL_SECONDS` | ⬜ | Redis presence key TTL | `60` |
| `ADMIN_SETUP_TOKEN` | ✅ | One-time token for first admin creation | random secure string |
| `ADMIN_SEED_NAME` | ⬜ | First admin display name | `Platform Admin` |
| `ADMIN_SEED_EMAIL` | ⬜ | First admin email | `admin@yourdomain.com` |
| `ADMIN_SEED_PASSWORD` | ⬜ | First admin password | strong password |
| `PLATFORM_COMMISSION_RATE` | ⬜ | Commission % taken per order | `10` (for 10%) |
| `NOTIFICATION_SERVICE_URL` | ⬜ | Notification service internal URL | `http://localhost:6009` |
| `NOTIFICATION_INTERNAL_TOKEN` | ⬜ | Token for internal notification API | random secure string |
| `NOTIFICATION_KAFKA_TOPIC` | ⬜ | Kafka topic for notification events | `notification.events` |
| `NOTIFICATION_KAFKA_GROUP_ID` | ⬜ | Consumer group for notifications | `notification-service` |

---

## CI/CD

The project uses **GitHub Actions** (`ci.yml`) triggered on pushes to `main` and all pull requests.

**Pipeline steps:**
1. Checkout with full git history (for Nx affected detection)
2. Set up Node.js 20 with npm cache
3. `npm ci` — clean install
4. `npx nx run-many -t lint test build typecheck` — run all targets across affected projects in parallel
5. `npx nx fix-ci` — auto-fix CI issues where possible (always runs)

**Nx Cloud** integration is configured (`nxCloudId` in `nx.json`) for remote caching and optional distributed task execution. Distributed agents are commented out in the workflow but can be enabled by uncommenting the `nx start-ci-run` step.

---

## Docker Support

Each backend service includes a **generated Dockerfile** (e.g., `apps/auth-service/Dockerfile`):

```dockerfile
FROM docker.io/node:lts-alpine
ENV HOST=0.0.0.0
ENV PORT=3000
WORKDIR /app
COPY dist .
RUN npm --omit=dev -f install
CMD [ "node", "main.js" ]
```

**Build a service image:**
```bash
npx nx docker:build @ecommerceapp/auth-service
```

**Run a service container:**
```bash
npx nx docker:run @ecommerceapp/auth-service -p 6001:3000
```

The Docker plugin is configured in `nx.json` under `@nx/docker` with `docker:build` and `docker:run` targets automatically inferred for each app.

---

## Architecture Decisions

**Monorepo with Nx** — All services and packages live in a single repository, enabling shared TypeScript types, shared libraries (Prisma client, auth middleware, error classes, product pricing logic), atomic commits across service boundaries, and Nx's powerful affected-project detection for CI efficiency.

**Shared Prisma schema** — A single `schema.prisma` at the root covers all data models. Every service imports the same Prisma client from `@libs/prisma`, ensuring schema consistency without duplicated model definitions. MongoDB's flexible document model accommodates the embedded types (`cartItem`, `userAnalyticsAction`, `ImageAsset`) well.

**API Gateway as sole ingress** — All frontend traffic enters through a single Express proxy. Rate limiting, CORS, and cookie parsing are applied once rather than duplicated across nine services.

**Kafka as the event backbone** — User behaviour events and notifications use Kafka for durability and decoupling. The analytics pipeline is write-intensive and can lag without affecting the user experience. Chat messages are buffered in Redis and flushed through Kafka to MongoDB to achieve both low-latency delivery and durable storage.

**TensorFlow.js for recommendations** — Running TF.js in Node.js keeps the recommendation model co-located with its training data (already in MongoDB) without requiring a Python service or an external ML platform. The hybrid approach (TF.js score × 0.75 + baseline score × 0.25) provides graceful quality degradation.

**Soft-delete with timed hard-delete** — Products are soft-deleted (setting `isDeleted = true` and `deletedAt`) and permanently removed by a cron job 24 hours later, giving sellers a recovery window while avoiding orphaned ImageKit assets.

**Secure review tokens** — Rather than passing database IDs in review invitation links, the system generates a `publicId.secret` token. The `tokenHash` (SHA-256 of the full token) is stored in the database; the secret is never persisted. This prevents enumeration attacks on review requests.

**Platform commission tracking** — Every successful order generates a `platformCommission` record capturing the rate, base, amount, and seller-receivable amount at the time of transaction. This provides an immutable audit trail independent of any future rate changes.
