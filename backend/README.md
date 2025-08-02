# Grocery Deals Backend

Backend service for the Grocery Deals App, providing REST APIs for deal aggregation, user management, and shopping list functionality.

## Features

- Deal aggregation from multiple grocery stores (Publix, Kroger)
- Location-based deal discovery
- User preference management
- Shopping list functionality
- Push notification support
- Price comparison across stores
- Web scraping for Publix deals
- Kroger API integration

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **Authentication**: JWT
- **Web Scraping**: Puppeteer
- **Logging**: Winston

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up the database:
```bash
# Create database
createdb grocery_deals_db

# Run migrations
psql -d grocery_deals_db -f database/schema.sql

# Seed with sample data (optional)
psql -d grocery_deals_db -f database/seed.sql
```

4. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Deals
- `GET /api/deals/nearby?lat={lat}&lng={lng}&radius={radius}` - Get nearby deals
- `GET /api/deals/:id` - Get specific deal

### Users
- `POST /api/users` - Create/update user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id/preferences` - Update user preferences

### Shopping List
- `GET /api/shopping-list/:userId` - Get user's shopping list
- `POST /api/shopping-list/items` - Add item to shopping list
- `DELETE /api/shopping-list/items/:id` - Remove item from shopping list

### Notifications
- `POST /api/notifications/subscribe` - Subscribe to push notifications
- `DELETE /api/notifications/unsubscribe/:userId` - Unsubscribe from notifications

### Health Check
- `GET /health` - Service health status

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Database Migrations

Migrations are located in `database/migrations/` and should be run in order:

```bash
psql -d grocery_deals_db -f database/migrations/001_initial_schema.sql
psql -d grocery_deals_db -f database/migrations/002_indexes_and_functions.sql
```

## Project Structure

```
backend/
├── src/
│   ├── routes/          # API route handlers
│   ├── middleware/      # Express middleware
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── server.ts       # Main server file
├── database/
│   ├── migrations/     # Database migration files
│   ├── schema.sql      # Complete database schema
│   └── seed.sql        # Sample data
├── logs/               # Application logs
└── dist/               # Compiled JavaScript (generated)
```

## Environment Variables

See `.env.example` for all available configuration options.

## License

MIT