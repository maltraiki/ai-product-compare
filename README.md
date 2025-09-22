# AI Product Comparison Platform

A comprehensive AI-powered product comparison platform that searches multiple sources (Noon.com, Amazon.sa, Jarir.com) and provides intelligent analysis to help users make informed purchasing decisions.

🚀 **Live Demo**: Coming soon!

## Features

- **Natural Language Search**: Enter product queries in plain English
- **Multi-Source Search**: Fetches products from Google Shopping and Amazon APIs
- **AI-Powered Analysis**: Uses Claude AI to analyze and compare products
- **Smart Recommendations**: Identifies best value, quality, and feature-rich products
- **Affiliate Integration**: Includes Amazon Associates affiliate links
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-Time Caching**: Redis caching for improved performance

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **AI Integration**: Claude API (Anthropic)
- **APIs**: Google Shopping Content API, Amazon Product Advertising API
- **Caching**: Redis (optional)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Redis server (optional, for caching)
- API keys for:
  - Claude API (Anthropic)
  - Google Shopping API
  - Amazon Product Advertising API

### Installation

1. Clone the repository:
```bash
cd ai-product-compare
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Edit `.env.local` with your API keys:
```env
CLAUDE_API_KEY=your_claude_api_key
GOOGLE_SHOPPING_API_KEY=your_google_api_key
GOOGLE_APPLICATION_CREDENTIALS=path_to_service_account.json
GOOGLE_MERCHANT_ID=your_merchant_id
AMAZON_ACCESS_KEY_ID=your_amazon_access_key
AMAZON_SECRET_ACCESS_KEY=your_amazon_secret_key
AMAZON_ASSOCIATE_TAG=your_affiliate_tag
REDIS_URL=redis://localhost:6379 # Optional
```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Production Build

```bash
npm run build
npm run start
```

## Project Structure

```
ai-product-compare/
├── app/
│   ├── api/
│   │   ├── search/       # Product search endpoint
│   │   └── analyze/      # AI analysis endpoint
│   ├── page.tsx          # Main application page
│   └── layout.tsx        # App layout
├── components/
│   ├── SearchInterface.tsx    # Search input component
│   ├── ProductCard.tsx        # Product display card
│   ├── ComparisonTable.tsx    # Side-by-side comparison
│   └── AnalysisReport.tsx     # AI analysis display
├── services/
│   ├── claudeAPI.ts      # Claude AI integration
│   ├── googleShopping.ts # Google Shopping API
│   ├── amazonAPI.ts      # Amazon Product API
│   └── dataProcessor.ts  # Data processing logic
├── types/
│   └── index.ts          # TypeScript type definitions
└── utils/
    └── helpers.ts        # Utility functions
```

## API Endpoints

### POST /api/search
Searches for products based on user query.

Request:
```json
{
  "query": "wireless headphones under $300",
  "preferences": {
    "priorities": ["quality", "value"],
    "budget": {"min": 100, "max": 300}
  }
}
```

### POST /api/analyze
Generates detailed AI analysis for products.

Request:
```json
{
  "products": [...],
  "preferences": {...}
}
```

## Features Breakdown

### 1. Natural Language Processing
- Claude AI processes user queries to extract search parameters
- Understands context like budget, features, and preferences

### 2. Multi-Source Product Search
- **Google Shopping**: Fetches products from Google's Shopping Content API
- **Amazon**: Retrieves products via Product Advertising API
- **Mock Data**: Fallback mock data when APIs are not configured

### 3. Intelligent Product Analysis
- Compares products across multiple dimensions
- Identifies category winners (best value, quality, features)
- Generates buying guides and recommendations
- Provides pros and cons for each product

### 4. User Interface
- **Search Interface**: Natural language input with example queries
- **Product Grid**: Card-based product display
- **Comparison Table**: Side-by-side feature comparison
- **Analysis Report**: Comprehensive AI-generated insights

## Configuration

### Google Shopping API Setup
1. Create a Google Cloud project
2. Enable Content API for Shopping
3. Create service account credentials
4. Download JSON credentials file
5. Set path in `GOOGLE_APPLICATION_CREDENTIALS`

### Amazon API Setup
1. Register for Amazon Associates program
2. Apply for Product Advertising API access
3. Get Access Key ID and Secret Access Key
4. Configure associate tag for affiliate links

### Claude API Setup
1. Sign up for Anthropic Claude API
2. Get your API key from the dashboard
3. Add to environment variables

## Deployment

### Vercel Deployment
```bash
vercel
```

The project includes `vercel.json` with optimized settings for production deployment.

### Environment Variables
Set the following in your deployment platform:
- All API keys from `.env.local.example`
- Configure Redis URL for production caching
- Set appropriate regions for optimal performance

## Performance Optimization

- **Caching**: Redis caching with TTL for API responses
- **Parallel Processing**: Concurrent API calls to multiple sources
- **Data Deduplication**: Intelligent product matching and merging
- **Lazy Loading**: Images loaded on demand
- **Response Compression**: Optimized API payloads

## Security

- Input sanitization for all user queries
- API keys stored securely in environment variables
- Rate limiting on API endpoints
- CORS configuration for API routes
- XSS and injection protection

## License

This project is for demonstration purposes. Ensure compliance with API terms of service for Google Shopping, Amazon, and Claude when using in production.

## Support

For issues or questions, please open an issue in the repository.

## Acknowledgments

- Powered by Claude AI (Anthropic)
- Google Shopping Content API
- Amazon Product Advertising API
- Built with Next.js and React
