import { NextRequest, NextResponse } from 'next/server';
import { ClaudeAPIClient } from '@/services/claudeAPI';
import { GeminiAPIClient } from '@/services/geminiAPI';
import { RealProductSearchClient } from '@/services/realProductSearch';
import { AmazonAPIClient } from '@/services/amazonAPI';
import { DataProcessor } from '@/services/dataProcessor';
// import { WebScraperService } from '@/services/webScraper';
import {
  SearchRequest,
  SearchResponse,
  APIResponse,
  SearchParams,
  Product
} from '@/types';

const claudeClient = new ClaudeAPIClient();
const geminiClient = new GeminiAPIClient();
const productSearchClient = new RealProductSearchClient();
const amazonClient = new AmazonAPIClient();
const dataProcessor = new DataProcessor();
// const webScraper = new WebScraperService();

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();

    if (!body.query || body.query.trim().length === 0) {
      return NextResponse.json<APIResponse<null>>({
        success: false,
        error: 'Search query is required',
        timestamp: Date.now()
      }, { status: 400 });
    }

    const cacheKey = dataProcessor.generateCacheKey({
      query: body.query,
      preferences: body.preferences
    });

    const cachedResults = await dataProcessor.getCachedResults(cacheKey);
    if (cachedResults) {
      return NextResponse.json<APIResponse<SearchResponse>>({
        success: true,
        data: cachedResults,
        timestamp: Date.now()
      });
    }

    let searchParams: SearchParams;
    try {
      searchParams = await claudeClient.processUserQuery(body.query);
    } catch (claudeError) {
      console.log('Claude API unavailable, using basic parsing', claudeError);
      searchParams = {
        searchTerms: body.query,
        userPriorities: body.preferences?.priorities || []
      };
    }

    // Always use real search - NO hardcoding
    const [productResults, amazonResults] = await Promise.allSettled([
      productSearchClient.searchProducts(searchParams),
      amazonClient.searchItems(searchParams)
    ]);

    const products: Product[] =
      productResults.status === 'fulfilled' ? productResults.value : [];
    const amazonProducts: Product[] =
      amazonResults.status === 'fulfilled' ? amazonResults.value : [];

    // Combine all products
    const allProducts = [...products, ...amazonProducts];

    if (allProducts.length === 0) {
      return NextResponse.json<APIResponse<null>>({
        success: false,
        error: 'No products found. Try searching for specific product names like "iPhone 16" or "Samsung Galaxy S24"',
        timestamp: Date.now()
      }, { status: 404 });
    }

    const aggregatedProducts = await dataProcessor.aggregateProductData(
      products,
      amazonProducts
    );

    let normalizedProducts = aggregatedProducts;
    try {
      if (aggregatedProducts.length > 0) {
        normalizedProducts = await claudeClient.normalizeProductData(aggregatedProducts);
      }
    } catch (normalizeError) {
      console.log('Using pre-normalized data', normalizeError);
    }

    const userPreferences = body.preferences || {
      priorities: searchParams.userPriorities || [],
      budget: searchParams.priceRange,
      requiredFeatures: searchParams.mustHaveFeatures
    };

    // Try Claude first, fallback to Gemini if it fails
    // IMPORTANT: Pass the original search query for AI to analyze what user asked for
    let analysis;
    try {
      analysis = await claudeClient.generateComparativeAnalysis(
        body.query, // Pass the original search query
        normalizedProducts.slice(0, 10),
        userPreferences
      );
    } catch (claudeError) {
      console.log('Claude failed, trying Gemini:', claudeError);
      try {
        analysis = await geminiClient.generateComparativeAnalysis(
          body.query, // Pass the original search query
          normalizedProducts.slice(0, 10),
          userPreferences
        );
      } catch (geminiError) {
        console.log('Both AI services failed, using basic analysis');
        // Basic fallback analysis
        analysis = {
          executiveSummary: `Analysis of "${body.query}". Found ${normalizedProducts.length} related products from various retailers.`,
          overallRecommendation: {
            productId: normalizedProducts[0]?.id || '',
            reasoning: 'Selected based on availability and features.',
            confidenceScore: 70
          },
          categoryWinners: {},
          specificationComparisons: {},
          performanceAnalysis: {},
          valueAnalysis: {},
          userRecommendations: {},
          prosAndCons: {},
          finalVerdict: {
            overallWinner: normalizedProducts[0]?.title || '',
            percentageScore: 70,
            scenarios: [],
            longTermAnalysis: 'Analysis based on available data.'
          },
          detailedComparison: {},
          buyingGuide: ['Check retailer sites for current prices', 'Compare features based on your needs']
        };
      }
    }

    const response: SearchResponse = {
      products: normalizedProducts.slice(0, 20),
      analysis,
      searchParams,
      cacheKey
    };

    await dataProcessor.cacheResults(cacheKey, response, 3600);

    return NextResponse.json<APIResponse<SearchResponse>>({
      success: true,
      data: response,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Search API error:', error);

    return NextResponse.json<APIResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}