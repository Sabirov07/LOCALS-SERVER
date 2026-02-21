# LOCALS API Server

Next.js API server for the LOCALS marketplace mobile app. Uses Prisma ORM with existing Supabase PostgreSQL database.

## Setup

```bash
npm install
cp .env.example .env  # fill in your Supabase credentials
npx prisma generate
npx prisma db pull    # sync schema from existing DB (optional)
npm run dev           # runs on port 3001
```

## Auth

All mutating endpoints require `Authorization: Bearer <supabase_jwt>` header.
The server verifies the JWT via Supabase Admin SDK.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/auth` | ✅ | Get current user profile |
| PUT | `/api/auth` | ✅ | Update profile |
| GET | `/api/users/:id` | ❌ | Public user profile |
| GET | `/api/businesses` | ❌ | List/search businesses |
| POST | `/api/businesses` | ✅ | Create business |
| GET | `/api/businesses/:id` | ❌ | Business detail |
| PUT | `/api/businesses/:id` | ✅ | Update business (owner) |
| DELETE | `/api/businesses/:id` | ✅ | Delete business (owner) |
| GET | `/api/products` | ❌ | List/search products |
| POST | `/api/products` | ✅ | Create product |
| GET | `/api/products/:id` | ❌ | Product detail |
| PUT | `/api/products/:id` | ✅ | Update product (owner) |
| DELETE | `/api/products/:id` | ✅ | Delete product (owner) |
| GET | `/api/categories?businessId=` | ❌ | List categories |
| POST | `/api/categories` | ✅ | Create category |
| PUT | `/api/categories/:id` | ✅ | Update category |
| DELETE | `/api/categories/:id` | ✅ | Delete category |
| GET | `/api/posts` | ❌ | List posts |
| POST | `/api/posts` | ✅ | Create post |
| GET | `/api/chat` | ✅ | List conversations |
| POST | `/api/chat` | ✅ | Get/create conversation |
| GET | `/api/chat/:id/messages` | ✅ | Get messages |
| POST | `/api/chat/:id/messages` | ✅ | Send message |
| GET | `/api/rfqs` | ❌ | List RFQs |
| POST | `/api/rfqs` | ✅ | Create RFQ |
| GET | `/api/rfqs/:id` | ❌ | RFQ detail |
| DELETE | `/api/rfqs/:id` | ✅ | Delete RFQ (buyer) |
| GET | `/api/rfqs/:id/quotes` | ❌ | List quotes |
| POST | `/api/rfqs/:id/quotes` | ✅ | Submit quote |
| PUT | `/api/rfqs/:id/quotes/:qid` | ✅ | Accept/reject quote |
| GET | `/api/sourcing` | ❌ | List sourcing requests |
| POST | `/api/sourcing` | ✅ | Create sourcing request |
| DELETE | `/api/sourcing/:id` | ✅ | Delete sourcing request |
| GET | `/api/tags/:businessId` | ❌ | Get business tags |
| PUT | `/api/tags/:businessId` | ✅ | Update business tags |
| GET | `/api/follows?businessId=` | ✅ | Check follow status |
| POST | `/api/follows` | ✅ | Toggle follow |
| GET | `/api/discover` | ❌ | Homepage data |

## Architecture

- **Next.js 15** App Router API routes
- **Prisma ORM** for type-safe database access
- **Supabase Auth** JWT verification for authentication
- **PostgreSQL** (Supabase-hosted) — same DB as the mobile app
- All authorization checks (ownership) done server-side
