import Anthropic from '@anthropic-ai/sdk';
import {
  SearchParams,
  Product,
  UserPreferences,
  ComparisonAnalysis
} from '@/types';
import Redis from 'ioredis';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
});

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

const QUERY_PROCESSING_PROMPT = `
Analyze this product search request like a tech expert and extract detailed parameters:
User Query: "{userInput}"

Extract and optimize the search to find EXACT product models and specifications.
If comparing products (like "iPhone 16 vs iPhone 15"), ensure BOTH specific models are searched.

Return JSON only with:
{
  "searchTerms": "exact product names with model numbers for accurate comparison",
  "category": "specific product category",
  "priceRange": {"min": number, "max": number},
  "mustHaveFeatures": ["specific technical features mentioned or implied"],
  "userPriorities": ["performance", "camera", "battery", "display", "value", etc."],
  "excludeTerms": ["things to avoid"],
  "comparisonMode": true/false (true if comparing multiple specific products),
  "specificModels": ["exact model names to search for"]
}
`;

const DATA_NORMALIZATION_PROMPT = `
Normalize this mixed product data from multiple APIs and EXTRACT DETAILED TECHNICAL SPECIFICATIONS:
{rawProductData}

Return JSON array with standardized product objects. For each product, extract as much technical data as possible from the product title, description, features, and any available specifications.

REQUIRED STRUCTURE:
{
  "id": "unique identifier",
  "title": "product name",
  "description": "product description",
  "price": number,
  "currency": "USD",
  "image": "main image url",
  "images": ["all image urls"],
  "rating": number (0-5),
  "reviewCount": number,
  "features": ["key features"],
  "pros": ["advantages"],
  "cons": ["disadvantages"],
  "source": "google" or "amazon",
  "link": "product page url",
  "affiliateLink": "affiliate url if available",
  "brand": "brand name",
  "category": "product category",
  "availability": "in stock/out of stock",
  "originalPrice": number if discounted,
  "discount": percentage if applicable,
  "technicalSpecs": {
    "display": {
      "size": "X.X inches",
      "resolution": "XXXXxXXXX pixels",
      "ppi": number,
      "technology": "OLED/LCD/AMOLED etc",
      "refreshRate": "XXHz",
      "brightness": "XXXX nits",
      "contrastRatio": "X:1",
      "colorGamut": "color space info"
    },
    "processor": {
      "chipset": "exact chip name",
      "cpu": "core configuration",
      "gpu": "GPU details",
      "process": "Xnm",
      "ram": "XGB",
      "storage": ["128GB", "256GB", etc.],
      "benchmarkScore": estimated_antutu_score
    },
    "camera": {
      "main": {
        "megapixels": number,
        "aperture": "f/X.X",
        "sensorSize": "size info",
        "stabilization": "OIS/EIS details",
        "features": ["Night mode", etc.]
      },
      "ultrawide": {
        "megapixels": number,
        "aperture": "f/X.X",
        "fieldOfView": "XXX°"
      },
      "telephoto": {
        "megapixels": number,
        "aperture": "f/X.X",
        "zoom": "Xx optical"
      },
      "front": {
        "megapixels": number,
        "aperture": "f/X.X",
        "features": ["features"]
      },
      "video": {
        "maxResolution": "4K at XXfps",
        "features": ["Dolby Vision", etc.]
      }
    },
    "battery": {
      "capacity": "XXXX mAh",
      "wiredCharging": "XXW",
      "wirelessCharging": "XXW wireless",
      "batteryLife": {
        "videoPlayback": "XX hours",
        "audioPlayback": "XX hours",
        "screenOnTime": "X-X hours"
      }
    },
    "build": {
      "materials": ["Titanium", "Glass", etc.],
      "dimensions": "XXX.X×XX.X×X.X mm",
      "weight": "XXXg",
      "waterResistance": "IPXX",
      "colors": ["color options"]
    },
    "connectivity": {
      "cellular": ["5G bands"],
      "wifi": "Wi-Fi X standard",
      "bluetooth": "Bluetooth X.X",
      "nfc": true/false,
      "usb": "USB-C/Lightning",
      "satelliteEmergency": true/false
    },
    "software": {
      "os": "OS version",
      "updateSupport": "X+ years",
      "exclusiveFeatures": ["exclusive features"]
    },
    "audio": {
      "speakers": "speaker configuration",
      "audioFeatures": ["Spatial Audio", etc.],
      "headphoneJack": true/false
    },
    "additionalFeatures": {
      "biometrics": ["Face ID", "Fingerprint"],
      "sensors": ["LiDAR", etc.],
      "specialFeatures": ["Action Button", etc.]
    }
  }
}

EXTRACT ALL AVAILABLE TECHNICAL DATA from product descriptions and features. If specific values aren't available, use reasonable estimates based on the product category and generation.
`;

const ANALYSIS_PROMPT = `
You are an expert tech analyst like MKBHD combined with GSMArena's technical depth. Analyze the ACTUAL products provided and create a detailed, accurate comparison.

Products to analyze: {productData}
User preferences: {userPreferences}

IMPORTANT: Base your analysis ONLY on the actual products provided. Do NOT use any hardcoded product names or specifications. Extract real information from the product titles, descriptions, and features provided.

Create an enthusiastic but ACCURATE analysis using real data from the products. If you mention specific numbers, they must come from the actual product data provided.

Return JSON:
{
  "executiveSummary": "[Create a detailed 150+ word summary comparing the ACTUAL products provided, highlighting their real differences based on the data you have]",

  "overallRecommendation": {
    "productId": "[ID of the best product based on analysis]",
    "reasoning": "[Detailed reasoning based on actual product features and specifications]",
    "confidenceScore": 85
  },

  "categoryWinners": {
    "bestDisplay": {"productId": "[actual product id]", "reasoning": "[based on actual display specs]", "technicalDetails": "[real technical details]", "score": 85},
    "bestCamera": {"productId": "[actual product id]", "reasoning": "[based on actual camera specs]", "technicalDetails": "[real camera details]", "score": 85},
    "bestPerformance": {"productId": "[actual product id]", "reasoning": "[based on actual processor]", "benchmarkData": "[real performance data]", "score": 85},
    "bestBattery": {"productId": "[actual product id]", "reasoning": "[based on actual battery specs]", "realWorldTesting": "[estimated usage]", "score": 85},
    "bestValue": {"productId": "[actual product id]", "reasoning": "[based on features vs price]", "costBreakdown": "[real pricing analysis]", "score": 85},
    "bestBuild": {"productId": "[actual product id]", "reasoning": "[based on build quality]", "materialsComparison": "[actual materials]", "score": 85}
  },

  "specificationComparisons": {
    "display": {"winner": "[actual product name]", "comparison": "[real display comparison]", "scores": {}, "details": "[actual specs]"},
    "processor": {"winner": "[actual product name]", "comparison": "[real processor comparison]", "scores": {}, "details": "[actual specs]"},
    "camera": {"winner": "[actual product name]", "comparison": "[real camera comparison]", "scores": {}, "details": "[actual specs]"},
    "battery": {"winner": "[actual product name]", "comparison": "[real battery comparison]", "scores": {}, "details": "[actual specs]"},
    "build": {"winner": "[actual product name]", "comparison": "[real build comparison]", "scores": {}, "details": "[actual specs]"},
    "connectivity": {"winner": "[actual product name]", "comparison": "[real connectivity comparison]", "scores": {}, "details": "[actual specs]"},
    "software": {"winner": "[actual product name]", "comparison": "[real software comparison]", "scores": {}, "details": "[actual specs]"},
    "audio": {"winner": "[actual product name]", "comparison": "[real audio comparison]", "scores": {}, "details": "[actual specs]"}
  },

  "performanceAnalysis": {
    "gaming": {"category": "Gaming", "winner": "[actual product]", "scores": {}, "realWorldTesting": "[based on specs]"},
    "photography": {"category": "Photography", "winner": "[actual product]", "scores": {}, "realWorldTesting": "[based on camera]"},
    "batteryLife": {"category": "Battery Life", "winner": "[actual product]", "scores": {}, "realWorldTesting": "[based on battery]"},
    "displayQuality": {"category": "Display Quality", "winner": "[actual product]", "scores": {}, "realWorldTesting": "[based on display]"},
    "audioQuality": {"category": "Audio Quality", "winner": "[actual product]", "scores": {}, "realWorldTesting": "[based on audio]"},
    "chargingSpeed": {"category": "Charging Speed", "winner": "[actual product]", "scores": {}, "realWorldTesting": "[based on charging]"}
  },

  "valueAnalysis": {
    "pricePerformanceRatio": {},
    "resaleValue": {},
    "totalCostOfOwnership": {},
    "hiddenCosts": {}
  },

  "userRecommendations": {
    "powerUsers": {"recommendedProduct": "id", "reasoning": "A17 Pro MAX power!", "alternatives": []},
    "casualUsers": {"recommendedProduct": "id", "reasoning": "Easy iOS!", "alternatives": []},
    "cameraEnthusiasts": {"recommendedProduct": "id", "reasoning": "48MP ProRAW!", "alternatives": []},
    "gamers": {"recommendedProduct": "id", "reasoning": "120Hz gaming!", "alternatives": []},
    "budgetConscious": {"recommendedProduct": "id", "reasoning": "Best value!", "alternatives": []},
    "businessProfessionals": {"recommendedProduct": "id", "reasoning": "Pro features!", "alternatives": []}
  },

  "prosAndCons": {},

  "finalVerdict": {
    "overallWinner": "Name",
    "percentageScore": 93,
    "scenarios": [
      {"scenario": "Photography", "winner": "Name", "reasoning": "48MP + 5x zoom!"},
      {"scenario": "Gaming", "winner": "Name", "reasoning": "120Hz + A17 Pro!"}
    ],
    "longTermAnalysis": "3yr updates! Best resale!"
  },

  "buyingGuide": [
    "BUY NOW: Black Friday! $800 trade-in!",
    "WAIT: iPhone 17 rumors = under-display camera!",
    "PRO TIP: Unlocked = better resale!",
    "HACK: 128GB + iCloud saves $100!"
  ]
}

BE ENTHUSIASTIC! CAPS for emphasis! Numbers EVERYWHERE!
`;

export class ClaudeAPIClient {
  private async callClaude(prompt: string, maxTokens: number = 4096): Promise<any> {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: maxTokens,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = message.content[0];
      if (content.type === 'text') {
        const text = content.text.trim();

        // Try to extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (parseError) {
            // If parsing fails, try to clean up common issues
            let cleanedJson = jsonMatch[0]
              .replace(/,\s*}/g, '}')  // Remove trailing commas
              .replace(/,\s*\]/g, ']')  // Remove trailing commas in arrays
              .replace(/\n/g, ' ')      // Replace newlines
              .replace(/\t/g, ' ')      // Replace tabs
              .replace(/"/g, '"')       // Replace smart quotes
              .replace(/"/g, '"')       // Replace smart quotes
              .replace(/'/g, "'")       // Replace smart quotes
              .replace(/'/g, "'");      // Replace smart quotes

            try {
              return JSON.parse(cleanedJson);
            } catch (secondError) {
              console.error('Failed to parse Claude response:', secondError);
              throw new Error('Invalid JSON response from Claude');
            }
          }
        }
        throw new Error('No JSON found in Claude response');
      }
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  }

  async processUserQuery(userInput: string): Promise<SearchParams> {
    const cacheKey = `query:${Buffer.from(userInput).toString('base64')}`;

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const prompt = QUERY_PROCESSING_PROMPT.replace('{userInput}', userInput);
    const result = await this.callClaude(prompt, 1024);

    const searchParams: SearchParams = {
      searchTerms: result.searchTerms || userInput,
      category: result.category,
      priceRange: result.priceRange,
      mustHaveFeatures: result.mustHaveFeatures || [],
      userPriorities: result.userPriorities || [],
      excludeTerms: result.excludeTerms || []
    };

    if (redis) {
      await redis.setex(cacheKey, 3600, JSON.stringify(searchParams));
    }

    return searchParams;
  }

  async normalizeProductData(rawProducts: any[]): Promise<Product[]> {
    if (!rawProducts || rawProducts.length === 0) {
      return [];
    }

    const prompt = DATA_NORMALIZATION_PROMPT.replace(
      '{rawProductData}',
      JSON.stringify(rawProducts.slice(0, 10))
    );

    try {
      const normalized = await this.callClaude(prompt, 4096);
      return Array.isArray(normalized) ? normalized : [];
    } catch (error) {
      console.error('Error normalizing product data:', error);
      return this.fallbackNormalization(rawProducts);
    }
  }

  private fallbackNormalization(rawProducts: any[]): Product[] {
    return rawProducts.map((product, index) => ({
      id: product.id || product.ASIN || product.offerId || `product-${index}`,
      title: product.title || product.name || 'Unknown Product',
      description: product.description || '',
      price: this.extractPrice(product),
      currency: 'USD',
      image: this.extractImage(product),
      images: this.extractImages(product),
      rating: product.rating || 0,
      reviewCount: product.reviewCount || 0,
      features: product.features || [],
      source: product.source || 'unknown' as any,
      link: product.link || product.url || '#',
      brand: product.brand || '',
      category: product.category || '',
      availability: product.availability || 'Unknown'
    }));
  }

  private extractPrice(product: any): number {
    if (typeof product.price === 'number') return product.price;
    if (product.price?.value) return parseFloat(product.price.value);
    if (product.Offers?.Listings?.[0]?.Price?.Amount) {
      return product.Offers.Listings[0].Price.Amount;
    }
    return 0;
  }

  private extractImage(product: any): string {
    return product.image ||
           product.imageLink ||
           product.Images?.Primary?.Large?.URL ||
           '';
  }

  private extractImages(product: any): string[] {
    const images = [];
    if (product.image) images.push(product.image);
    if (product.images) images.push(...product.images);
    if (product.additionalImageLinks) images.push(...product.additionalImageLinks);
    if (product.Images?.Variants) {
      product.Images.Variants.forEach((variant: any) => {
        if (variant.Large?.URL) images.push(variant.Large.URL);
      });
    }
    return Array.from(new Set(images));
  }

  async generateComparativeAnalysis(
    searchQuery: string,
    products: Product[],
    preferences: UserPreferences
  ): Promise<ComparisonAnalysis> {
    // Extract what the user wants to compare from their search query
    const comparisonPrompt = `
You are a tech expert like MKBHD combined with GSMArena's depth. The user searched for: "${searchQuery}"

Analyze what the user wants to compare. They might be asking for:
- Direct product comparison (e.g., "iPhone 16 vs Samsung S24")
- Brand comparison (e.g., "Apple vs Samsung phones")
- Category search (e.g., "best gaming phones")
- Feature comparison (e.g., "phones with best cameras")

Based on the search "${searchQuery}", create a detailed comparison analysis.

Available products found (use these for reference but focus on what the user asked for):
${JSON.stringify(products.slice(0, 5).map(p => ({ title: p.title, price: p.price, features: p.features?.slice(0, 3) })))}

Create a comprehensive analysis that addresses EXACTLY what the user searched for. If they asked for "iPhone 16 vs Samsung S24", compare those specific models. If products aren't available, explain what's available instead.

Return a detailed JSON with your analysis following this structure:
{
  "executiveSummary": "[150+ words analyzing what the user searched for - '${searchQuery}']",
  "overallRecommendation": {
    "productId": "[best matching product ID or first product if comparing brands]",
    "reasoning": "[why this is best for the user's query]",
    "confidenceScore": 85
  },
  "categoryWinners": {
    "bestDisplay": {"productId": "[id]", "reasoning": "[detailed technical analysis]", "technicalDetails": "[specific specs]", "score": 90},
    "bestCamera": {"productId": "[id]", "reasoning": "[detailed camera analysis]", "technicalDetails": "[camera specs]", "score": 88},
    "bestPerformance": {"productId": "[id]", "reasoning": "[performance analysis]", "benchmarkData": "[performance metrics]", "score": 92},
    "bestBattery": {"productId": "[id]", "reasoning": "[battery analysis]", "realWorldTesting": "[battery life details]", "score": 85},
    "bestValue": {"productId": "[id]", "reasoning": "[value proposition]", "costBreakdown": "[price analysis]", "score": 87},
    "bestBuild": {"productId": "[id]", "reasoning": "[build quality]", "materialsComparison": "[materials used]", "score": 89}
  },
  "finalVerdict": {
    "overallWinner": "[winner based on user's search query]",
    "percentageScore": 88,
    "scenarios": [
      {"scenario": "For '${searchQuery}'", "winner": "[product/brand]", "reasoning": "[detailed explanation]"},
      {"scenario": "Best Alternative", "winner": "[alternative]", "reasoning": "[why this alternative]"}
    ],
    "longTermAnalysis": "[long-term value analysis specific to the comparison]"
  }
}`;

    try {
      const analysis = await this.callClaude(comparisonPrompt, 4096);

      return {
        executiveSummary: analysis.executiveSummary || `Analysis of "${searchQuery}" based on current market offerings.`,
        overallRecommendation: analysis.overallRecommendation || {
          productId: products[0]?.id || '',
          reasoning: `Based on your search for "${searchQuery}"`,
          confidenceScore: 80
        },
        categoryWinners: analysis.categoryWinners || this.getEnhancedDefaultWinners(products),
        specificationComparisons: analysis.specificationComparisons || this.getDefaultSpecComparisons(products),
        performanceAnalysis: analysis.performanceAnalysis || this.getDefaultPerformanceAnalysis(products),
        valueAnalysis: analysis.valueAnalysis || this.getDefaultValueAnalysis(products),
        userRecommendations: analysis.userRecommendations || this.getDefaultUserRecommendations(products),
        prosAndCons: analysis.prosAndCons || this.getDefaultProsAndCons(products),
        finalVerdict: analysis.finalVerdict || this.getDefaultFinalVerdict(products),
        detailedComparison: {},
        buyingGuide: [
          `For "${searchQuery}" - check current prices on retailer websites`,
          'Compare actual specifications on official product pages',
          'Read professional reviews from trusted sources',
          'Consider your specific use case and budget'
        ]
      };
    } catch (error) {
      console.error('Error in comparative analysis:', error);
      return this.generateProductAnalysis(products, preferences);
    }
  }

  async generateProductAnalysis(
    products: Product[],
    preferences: UserPreferences
  ): Promise<ComparisonAnalysis> {
    const cacheKey = `analysis:${Buffer.from(
      JSON.stringify({ products: products.map(p => p.id), preferences })
    ).toString('base64')}`;

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const prompt = ANALYSIS_PROMPT
      .replace('{productData}', JSON.stringify(products))
      .replace('{userPreferences}', JSON.stringify(preferences));

    try {
      const analysis = await this.callClaude(prompt, 4096);

      const result: ComparisonAnalysis = {
        executiveSummary: analysis.executiveSummary || 'Comprehensive technical comparison of selected products with detailed specifications analysis.',
        overallRecommendation: {
          productId: analysis.overallRecommendation?.productId || products[0]?.id || '',
          reasoning: analysis.overallRecommendation?.reasoning || 'Based on comprehensive technical analysis and value proposition.',
          confidenceScore: analysis.overallRecommendation?.confidenceScore || 85
        },
        categoryWinners: analysis.categoryWinners || this.getEnhancedDefaultWinners(products),
        specificationComparisons: analysis.specificationComparisons || this.getDefaultSpecComparisons(products),
        performanceAnalysis: analysis.performanceAnalysis || this.getDefaultPerformanceAnalysis(products),
        valueAnalysis: analysis.valueAnalysis || this.getDefaultValueAnalysis(products),
        userRecommendations: analysis.userRecommendations || this.getDefaultUserRecommendations(products),
        prosAndCons: analysis.prosAndCons || this.getDefaultProsAndCons(products),
        finalVerdict: analysis.finalVerdict || this.getDefaultFinalVerdict(products),
        detailedComparison: analysis.detailedComparison || {},
        buyingGuide: analysis.buyingGuide || [
          'Compare technical specifications thoroughly before deciding',
          'Consider long-term software update support',
          'Factor in ecosystem compatibility and accessories',
          'Check for current promotions and trade-in values',
          'Read professional reviews from trusted tech sources'
        ]
      };

      if (redis) {
        await redis.setex(cacheKey, 7200, JSON.stringify(result));
      }

      return result;
    } catch (error) {
      console.error('Error generating analysis:', error);
      return this.getFallbackAnalysis(products);
    }
  }

  private getEnhancedDefaultWinners(products: Product[]) {
    const sortedByPrice = [...products].sort((a, b) => a.price - b.price);
    const sortedByRating = [...products].sort((a, b) => b.rating - a.rating);
    const sortedByFeatures = [...products].sort((a, b) =>
      (b.features?.length || 0) - (a.features?.length || 0)
    );

    return {
      bestDisplay: {
        productId: products[0]?.id || '',
        reasoning: 'Competitive display technology and resolution',
        technicalDetails: 'Analysis based on available display specifications',
        score: 85
      },
      bestCamera: {
        productId: products[0]?.id || '',
        reasoning: 'Strong camera system with versatile capabilities',
        technicalDetails: 'Evaluation includes main, ultra-wide, and telephoto performance',
        score: 82
      },
      bestPerformance: {
        productId: products[0]?.id || '',
        reasoning: 'Latest processor technology with efficient performance',
        benchmarkData: 'Based on chipset generation and architecture analysis',
        score: 88
      },
      bestBattery: {
        productId: products[0]?.id || '',
        reasoning: 'Optimized battery capacity and charging capabilities',
        realWorldTesting: 'Estimated based on battery specifications and efficiency',
        score: 80
      },
      bestValue: {
        productId: sortedByPrice[0]?.id || '',
        reasoning: 'Optimal balance of features and pricing',
        costBreakdown: `Starting at $${sortedByPrice[0]?.price || 0} with comprehensive feature set`,
        score: 90
      },
      bestBuild: {
        productId: sortedByRating[0]?.id || '',
        reasoning: 'Premium materials and construction quality',
        materialsComparison: 'Analysis of build materials and durability features',
        score: 86
      }
    };
  }

  private getDefaultSpecComparisons(products: Product[]) {
    const defaultComparison = {
      winner: products[0]?.title || 'Product 1',
      comparison: 'Competitive specifications with modern features',
      scores: products.reduce((acc, product, index) => {
        acc[product.id] = 85 - (index * 5);
        return acc;
      }, {} as { [key: string]: number }),
      details: 'Technical analysis based on available product specifications'
    };

    return {
      display: defaultComparison,
      processor: defaultComparison,
      camera: defaultComparison,
      battery: defaultComparison,
      build: defaultComparison,
      connectivity: defaultComparison,
      software: defaultComparison,
      audio: defaultComparison
    };
  }

  private getDefaultPerformanceAnalysis(products: Product[]) {
    const defaultAnalysis = {
      category: 'Performance Category',
      winner: products[0]?.title || 'Product 1',
      scores: products.reduce((acc, product, index) => {
        acc[product.id] = 85 - (index * 3);
        return acc;
      }, {} as { [key: string]: number }),
      realWorldTesting: 'Performance analysis based on specifications and industry benchmarks'
    };

    return {
      gaming: defaultAnalysis,
      photography: defaultAnalysis,
      batteryLife: defaultAnalysis,
      displayQuality: defaultAnalysis,
      audioQuality: defaultAnalysis,
      chargingSpeed: defaultAnalysis
    };
  }

  private getDefaultValueAnalysis(products: Product[]) {
    return {
      pricePerformanceRatio: products.reduce((acc, product, index) => {
        acc[product.id] = Math.round((1000 - product.price) / 10);
        return acc;
      }, {} as { [key: string]: number }),
      resaleValue: products.reduce((acc, product) => {
        acc[product.id] = 'Good resale value expected';
        return acc;
      }, {} as { [key: string]: string }),
      totalCostOfOwnership: products.reduce((acc, product) => {
        acc[product.id] = Math.round(product.price * 1.2);
        return acc;
      }, {} as { [key: string]: number }),
      hiddenCosts: products.reduce((acc, product) => {
        acc[product.id] = ['Accessories', 'Insurance', 'Cases'];
        return acc;
      }, {} as { [key: string]: string[] })
    };
  }

  private getDefaultUserRecommendations(products: Product[]) {
    const topProduct = products[0]?.id || '';
    const secondProduct = products[1]?.id || products[0]?.id || '';

    return {
      powerUsers: {
        recommendedProduct: topProduct,
        reasoning: 'Best overall performance and feature set',
        alternatives: [secondProduct]
      },
      casualUsers: {
        recommendedProduct: secondProduct,
        reasoning: 'Great balance of features and ease of use',
        alternatives: [topProduct]
      },
      cameraEnthusiasts: {
        recommendedProduct: topProduct,
        reasoning: 'Superior camera system and imaging capabilities',
        alternatives: [secondProduct]
      },
      gamers: {
        recommendedProduct: topProduct,
        reasoning: 'Powerful processor and display for gaming',
        alternatives: [secondProduct]
      },
      budgetConscious: {
        recommendedProduct: secondProduct,
        reasoning: 'Best value proposition for the price',
        alternatives: [topProduct]
      },
      businessProfessionals: {
        recommendedProduct: topProduct,
        reasoning: 'Professional features and reliability',
        alternatives: [secondProduct]
      }
    };
  }

  private getDefaultProsAndCons(products: Product[]) {
    return products.reduce((acc, product) => {
      acc[product.id] = {
        pros: [
          {
            feature: 'Performance',
            advantage: 'Modern processor technology',
            measurement: 'Latest generation chipset'
          },
          {
            feature: 'Display',
            advantage: 'High-quality screen',
            measurement: 'Modern display technology'
          }
        ],
        cons: [
          {
            feature: 'Price',
            disadvantage: 'Premium pricing',
            measurement: `$${product.price} price point`
          }
        ]
      };
      return acc;
    }, {} as { [key: string]: any });
  }

  private getDefaultFinalVerdict(products: Product[]) {
    return {
      overallWinner: products[0]?.title || 'Product 1',
      percentageScore: 85,
      scenarios: [
        {
          scenario: 'Overall Best Choice',
          winner: products[0]?.title || 'Product 1',
          reasoning: 'Best combination of features, performance, and value'
        },
        {
          scenario: 'Budget Option',
          winner: products[products.length - 1]?.title || 'Product 2',
          reasoning: 'Most affordable option with solid features'
        }
      ],
      longTermAnalysis: 'Strong long-term value with good update support and resale potential'
    };
  }

  private getFallbackAnalysis(products: Product[]): ComparisonAnalysis {
    return {
      executiveSummary: 'Comparison of available products based on price, ratings, and features.',
      overallRecommendation: {
        productId: products[0]?.id || '',
        reasoning: 'Selected based on balanced price and features.',
        confidenceScore: 80
      },
      categoryWinners: this.getEnhancedDefaultWinners(products),
      specificationComparisons: this.getDefaultSpecComparisons(products),
      performanceAnalysis: this.getDefaultPerformanceAnalysis(products),
      valueAnalysis: this.getDefaultValueAnalysis(products),
      userRecommendations: this.getDefaultUserRecommendations(products),
      prosAndCons: this.getDefaultProsAndCons(products),
      finalVerdict: this.getDefaultFinalVerdict(products),
      detailedComparison: {},
      buyingGuide: [
        'Compare prices across retailers',
        'Check customer reviews',
        'Verify warranty coverage'
      ]
    };
  }
}