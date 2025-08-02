# Grocery Deals App

A comprehensive iOS application with backend services that helps users discover and track grocery deals across multiple stores through location-based services, automated deal scraping, and personalized shopping lists.

## Features

### iOS App
- **Lock-screen widget** for quick access to nearby deals
- **Location-based deal discovery** from Publix and Kroger
- **Shopping list management** with swipe actions and filtering
- **Price comparison** across multiple stores
- **Push notifications** for deal expiration and new matches
- **Offline functionality** with local caching

### Backend Services
- **Deal aggregation** from multiple sources (web scraping + APIs)
- **REST API** for mobile app communication
- **Real-time data synchronization**
- **User preference management**
- **Push notification delivery**

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   iOS App       │    │  Backend API    │    │  External APIs  │
│                 │    │                 │    │                 │
│ • SwiftUI       │◄──►│ • Node.js       │◄──►│ • Kroger API    │
│ • Widget        │    │ • Express.js    │    │ • Publix Web    │
│ • Core Data     │    │ • PostgreSQL    │    │   Scraping      │
│ • Location      │    │ • Redis Cache   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Project Structure

```
grocery-deals-app/
├── ios/                          # iOS application
│   ├── GroceryDealsApp/          # Main app target
│   │   ├── Models/               # Data models
│   │   ├── Views/                # SwiftUI views
│   │   └── Services/             # API clients, location services
│   └── DealWidget/               # Widget extension
├── backend/                      # Node.js backend
│   ├── src/                      # TypeScript source code
│   │   ├── routes/               # API endpoints
│   │   ├── types/                # Type definitions
│   │   └── middleware/           # Express middleware
│   └── database/                 # SQL schema and migrations
└── .kiro/specs/grocery-deals-app/ # Project specifications
```

## Getting Started

### Prerequisites

- **iOS Development**: Xcode 15+, iOS 17+
- **Backend**: Node.js 18+, PostgreSQL 14+, Redis 6+

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up database:
```bash
createdb grocery_deals_db
psql -d grocery_deals_db -f database/schema.sql
psql -d grocery_deals_db -f database/seed.sql  # Optional sample data
```

5. Start development server:
```bash
npm run dev
```

### iOS Setup

1. Open the Xcode project:
```bash
open ios/GroceryDealsApp.xcodeproj
```

2. Configure signing and provisioning profiles

3. Build and run the app on simulator or device

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Key Endpoints

- `GET /deals/nearby?lat={lat}&lng={lng}&radius={radius}` - Location-based deals
- `POST /shopping-list/items` - Add items to shopping list
- `GET /price-comparison/{itemId}` - Compare prices across stores
- `POST /notifications/subscribe` - Subscribe to push notifications

See [backend/README.md](backend/README.md) for complete API documentation.

## Data Models

### Core Models
- **Deal**: Store promotions with pricing, validity, and location data
- **Store Location**: Physical store information with hours and coordinates  
- **Shopping List Item**: User-saved deals with quantity and priority
- **User**: Device preferences, location, and notification settings

### Database Schema
- PostgreSQL with UUID primary keys
- Spatial indexing for location-based queries
- JSONB for flexible preference storage
- Automated timestamp triggers

## Development

### iOS Development
- SwiftUI for modern, declarative UI
- WidgetKit for lock-screen functionality
- Core Location for GPS services
- Core Data for offline caching

### Backend Development
- TypeScript for type safety
- Express.js for REST API
- Puppeteer for web scraping
- Winston for structured logging

### Testing
```bash
# Backend tests
cd backend && npm test

# iOS tests
# Run from Xcode: Cmd+U
```

## Deployment

### Backend
- Docker containerization ready
- Environment-based configuration
- Database migrations included
- Health check endpoints

### iOS
- App Store distribution ready
- Widget extension included
- Push notification certificates required

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details