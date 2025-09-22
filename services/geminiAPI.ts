import { GoogleGenerativeAI } from '@google/generative-ai';
import { Product, UserPreferences, ComparisonAnalysis } from '@/types';

export class GeminiAPIClient {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Gemini API key not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generateComparativeAnalysis(
    searchQuery: string,
    products: Product[],
    preferences: UserPreferences
  ): Promise<ComparisonAnalysis> {
    if (!process.env.GEMINI_API_KEY) {
      console.log('Gemini API not configured, using fallback');
      return this.getFallbackAnalysis(products);
    }

    const prompt = `
You are a tech expert. The user searched for: "${searchQuery}"

STRICT RULES:
1. ONLY analyze "${searchQuery}" - nothing else
2. If user searched "iPhone 17", ONLY discuss iPhone 17
3. NEVER mention iPhone 15 or iPhone 16 unless user specifically searched for them
4. If product doesn't exist yet (like iPhone 17), discuss expected features and rumors
5. Focus ONLY on what was searched: "${searchQuery}"

User's exact search: "${searchQuery}"

Available products (reference only):
${JSON.stringify(products.slice(0, 5).map(p => ({ title: p.title, price: p.price })))}

Return JSON:
{
  "executiveSummary": "[150+ word analysis of '${searchQuery}']",
  "overallRecommendation": {
    "productId": "[best product id for this query]",
    "reasoning": "[why this wins for '${searchQuery}']",
    "confidenceScore": 85
  },
  "categoryWinners": {
    "bestDisplay": {"productId": "[id]", "reasoning": "[analysis]", "technicalDetails": "[specs]", "score": 85},
    "bestCamera": {"productId": "[id]", "reasoning": "[analysis]", "technicalDetails": "[specs]", "score": 85},
    "bestPerformance": {"productId": "[id]", "reasoning": "[analysis]", "benchmarkData": "[data]", "score": 85},
    "bestBattery": {"productId": "[id]", "reasoning": "[analysis]", "realWorldTesting": "[details]", "score": 85},
    "bestValue": {"productId": "[id]", "reasoning": "[analysis]", "costBreakdown": "[price info]", "score": 85},
    "bestBuild": {"productId": "[id]", "reasoning": "[analysis]", "materialsComparison": "[materials]", "score": 85}
  },
  "finalVerdict": {
    "overallWinner": "[winner for '${searchQuery}']",
    "percentageScore": 85,
    "scenarios": [
      {"scenario": "For your search", "winner": "[winner]", "reasoning": "[why]"},
      {"scenario": "Best value", "winner": "[winner]", "reasoning": "[why]"}
    ],
    "longTermAnalysis": "[analysis specific to the comparison]"
  }
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in Gemini response');
        return this.getFallbackAnalysis(products);
      }

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        executiveSummary: analysis.executiveSummary || `Analysis of "${searchQuery}"`,
        overallRecommendation: analysis.overallRecommendation || {
          productId: products[0]?.id || '',
          reasoning: `Based on "${searchQuery}"`,
          confidenceScore: 75
        },
        categoryWinners: analysis.categoryWinners || this.getDefaultWinners(products),
        specificationComparisons: this.getDefaultSpecComparisons(products),
        performanceAnalysis: this.getDefaultPerformanceAnalysis(products),
        valueAnalysis: this.getDefaultValueAnalysis(products),
        userRecommendations: this.getDefaultUserRecommendations(products),
        prosAndCons: this.getDefaultProsAndCons(products),
        finalVerdict: analysis.finalVerdict || {
          overallWinner: products[0]?.title || '',
          percentageScore: 75,
          scenarios: [
            { scenario: `For "${searchQuery}"`, winner: products[0]?.title || '', reasoning: 'Best match available' }
          ],
          longTermAnalysis: 'Based on current analysis'
        },
        detailedComparison: {},
        buyingGuide: [
          `For "${searchQuery}" - visit retailer sites for current prices`,
          'Compare features based on your needs',
          'Check warranty and support options'
        ]
      };
    } catch (error) {
      console.error('Gemini comparative analysis error:', error);
      return this.generateProductAnalysis(products, preferences);
    }
  }

  async generateProductAnalysis(
    products: Product[],
    preferences: UserPreferences
  ): Promise<ComparisonAnalysis> {
    if (!process.env.GEMINI_API_KEY) {
      console.log('Gemini API not configured, using fallback');
      return this.getFallbackAnalysis(products);
    }

    const prompt = `
You are an expert tech analyst. Analyze these products and create a detailed comparison.

Products: ${JSON.stringify(products.map(p => ({
  id: p.id,
  title: p.title,
  description: p.description,
  features: p.features,
  price: p.price,
  source: p.source
})))}

User preferences: ${JSON.stringify(preferences)}

Create a detailed analysis comparing the actual products provided. Base your analysis ONLY on the real product data given.

Return a JSON object with this structure:
{
  "executiveSummary": "[150+ word detailed comparison of the actual products]",
  "overallRecommendation": {
    "productId": "[best product id]",
    "reasoning": "[why this product wins based on real features]",
    "confidenceScore": 85
  },
  "categoryWinners": {
    "bestDisplay": {"productId": "[id]", "reasoning": "[based on actual specs]", "technicalDetails": "[real details]", "score": 85},
    "bestCamera": {"productId": "[id]", "reasoning": "[based on actual specs]", "technicalDetails": "[real details]", "score": 85},
    "bestPerformance": {"productId": "[id]", "reasoning": "[based on actual specs]", "benchmarkData": "[real data]", "score": 85},
    "bestBattery": {"productId": "[id]", "reasoning": "[based on actual specs]", "realWorldTesting": "[estimated]", "score": 85},
    "bestValue": {"productId": "[id]", "reasoning": "[based on features]", "costBreakdown": "[analysis]", "score": 85},
    "bestBuild": {"productId": "[id]", "reasoning": "[based on build]", "materialsComparison": "[materials]", "score": 85}
  },
  "finalVerdict": {
    "overallWinner": "[product title]",
    "percentageScore": 85,
    "scenarios": [
      {"scenario": "Best Overall", "winner": "[product title]", "reasoning": "[why]"},
      {"scenario": "Best Value", "winner": "[product title]", "reasoning": "[why]"}
    ],
    "longTermAnalysis": "[analysis based on actual products]"
  }
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in Gemini response');
        return this.getFallbackAnalysis(products);
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Ensure all required fields exist
      return {
        executiveSummary: analysis.executiveSummary || 'Product comparison based on available data.',
        overallRecommendation: analysis.overallRecommendation || {
          productId: products[0]?.id || '',
          reasoning: 'Based on overall features and value.',
          confidenceScore: 75
        },
        categoryWinners: analysis.categoryWinners || this.getDefaultWinners(products),
        specificationComparisons: analysis.specificationComparisons || this.getDefaultSpecComparisons(products),
        performanceAnalysis: analysis.performanceAnalysis || this.getDefaultPerformanceAnalysis(products),
        valueAnalysis: analysis.valueAnalysis || this.getDefaultValueAnalysis(products),
        userRecommendations: analysis.userRecommendations || this.getDefaultUserRecommendations(products),
        prosAndCons: analysis.prosAndCons || this.getDefaultProsAndCons(products),
        finalVerdict: analysis.finalVerdict || {
          overallWinner: products[0]?.title || '',
          percentageScore: 75,
          scenarios: [
            { scenario: 'Best Overall', winner: products[0]?.title || '', reasoning: 'Top features' }
          ],
          longTermAnalysis: 'Based on current market analysis'
        },
        detailedComparison: {},
        buyingGuide: [
          'Check current prices on the retailer websites',
          'Compare warranty and support options',
          'Consider your specific use case needs'
        ]
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.getFallbackAnalysis(products);
    }
  }

  async normalizeProductData(products: Product[]): Promise<Product[]> {
    // For now, just return products as-is since normalization was causing issues
    return products;
  }

  async processUserQuery(query: string): Promise<any> {
    if (!process.env.GEMINI_API_KEY) {
      return {
        searchTerms: query,
        userPriorities: []
      };
    }

    const prompt = `Extract search terms from this query: "${query}". Return JSON: {"searchTerms": "extracted terms", "category": "product category"}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Gemini query processing error:', error);
    }

    return {
      searchTerms: query,
      userPriorities: []
    };
  }

  private getFallbackAnalysis(products: Product[]): ComparisonAnalysis {
    const bestProduct = products[0] || { id: '', title: 'No products', price: 0 };

    return {
      executiveSummary: `Comparison of ${products.length} products from various retailers. ${bestProduct.title} offers competitive features based on the available specifications.`,
      overallRecommendation: {
        productId: bestProduct.id,
        reasoning: 'Selected based on available features and specifications.',
        confidenceScore: 70
      },
      categoryWinners: this.getDefaultWinners(products),
      specificationComparisons: this.getDefaultSpecComparisons(products),
      performanceAnalysis: this.getDefaultPerformanceAnalysis(products),
      valueAnalysis: this.getDefaultValueAnalysis(products),
      userRecommendations: this.getDefaultUserRecommendations(products),
      prosAndCons: this.getDefaultProsAndCons(products),
      finalVerdict: {
        overallWinner: bestProduct.title,
        percentageScore: 75,
        scenarios: [
          { scenario: 'Best Overall', winner: bestProduct.title, reasoning: 'Top choice based on features' }
        ],
        longTermAnalysis: 'Analysis based on current specifications'
      },
      detailedComparison: {},
      buyingGuide: [
        'Visit retailer websites for current pricing',
        'Check for seasonal promotions',
        'Compare warranty options'
      ]
    };
  }

  private getDefaultWinners(products: Product[]) {
    const productId = products[0]?.id || '';
    return {
      bestDisplay: { productId, reasoning: 'Display quality', technicalDetails: 'Modern display', score: 80 },
      bestCamera: { productId, reasoning: 'Camera system', technicalDetails: 'Advanced imaging', score: 80 },
      bestPerformance: { productId, reasoning: 'Processing power', benchmarkData: 'High performance', score: 80 },
      bestBattery: { productId, reasoning: 'Battery life', realWorldTesting: 'All-day usage', score: 80 },
      bestValue: { productId, reasoning: 'Price to features ratio', costBreakdown: 'Competitive pricing', score: 80 },
      bestBuild: { productId, reasoning: 'Build quality', materialsComparison: 'Premium materials', score: 80 }
    };
  }

  private getDefaultSpecComparisons(products: Product[]) {
    const winner = products[0]?.title || 'Product';
    return {
      display: { winner, comparison: 'Display analysis', scores: {}, details: 'Display specs' },
      processor: { winner, comparison: 'Processor analysis', scores: {}, details: 'Performance specs' },
      camera: { winner, comparison: 'Camera analysis', scores: {}, details: 'Camera specs' },
      battery: { winner, comparison: 'Battery analysis', scores: {}, details: 'Battery specs' },
      build: { winner, comparison: 'Build analysis', scores: {}, details: 'Build quality' },
      connectivity: { winner, comparison: 'Connectivity', scores: {}, details: 'Network features' },
      software: { winner, comparison: 'Software', scores: {}, details: 'OS and updates' },
      audio: { winner, comparison: 'Audio', scores: {}, details: 'Sound quality' }
    };
  }

  private getDefaultPerformanceAnalysis(products: Product[]) {
    const winner = products[0]?.title || 'Product';
    return {
      gaming: { category: 'Gaming', winner, scores: {}, realWorldTesting: 'Gaming performance' },
      photography: { category: 'Photography', winner, scores: {}, realWorldTesting: 'Photo quality' },
      batteryLife: { category: 'Battery Life', winner, scores: {}, realWorldTesting: 'Battery endurance' },
      displayQuality: { category: 'Display Quality', winner, scores: {}, realWorldTesting: 'Visual quality' },
      audioQuality: { category: 'Audio Quality', winner, scores: {}, realWorldTesting: 'Sound performance' },
      chargingSpeed: { category: 'Charging Speed', winner, scores: {}, realWorldTesting: 'Charging time' }
    };
  }

  private getDefaultValueAnalysis(products: Product[]) {
    return {
      pricePerformanceRatio: products.reduce((acc, p) => ({ ...acc, [p.id]: 75 }), {}),
      resaleValue: products.reduce((acc, p) => ({ ...acc, [p.id]: 'Good' }), {}),
      totalCostOfOwnership: products.reduce((acc, p) => ({ ...acc, [p.id]: p.price }), {}),
      hiddenCosts: products.reduce((acc, p) => ({ ...acc, [p.id]: [] }), {})
    };
  }

  private getDefaultUserRecommendations(products: Product[]) {
    const productId = products[0]?.id || '';
    return {
      powerUsers: { recommendedProduct: productId, reasoning: 'High performance', alternatives: [] },
      casualUsers: { recommendedProduct: productId, reasoning: 'Easy to use', alternatives: [] },
      cameraEnthusiasts: { recommendedProduct: productId, reasoning: 'Camera features', alternatives: [] },
      gamers: { recommendedProduct: productId, reasoning: 'Gaming capable', alternatives: [] },
      budgetConscious: { recommendedProduct: productId, reasoning: 'Good value', alternatives: [] },
      businessProfessionals: { recommendedProduct: productId, reasoning: 'Professional features', alternatives: [] }
    };
  }

  private getDefaultProsAndCons(products: Product[]) {
    return products.reduce((acc, p) => ({
      ...acc,
      [p.id]: {
        pros: [{ feature: 'Features', advantage: 'Good feature set', measurement: 'Quality' }],
        cons: [{ feature: 'Price', disadvantage: 'Check for deals', measurement: 'Value' }]
      }
    }), {});
  }
}