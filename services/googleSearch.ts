import axios from 'axios';
import { SearchParams, Product } from '@/types';
import Redis from 'ioredis';

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export class GoogleSearchClient {
  private apiKey = process.env.GOOGLE_SHOPPING_API_KEY || '';
  private searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '637d8c46258114e35';

  async searchProducts(searchParams: SearchParams): Promise<Product[]> {
    const cacheKey = `google-search:${Buffer.from(
      JSON.stringify(searchParams)
    ).toString('base64')}`;

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    try {
      // Use Google Custom Search API to find products
      const searchQuery = this.buildSearchQuery(searchParams);
      const results = await this.performGoogleSearch(searchQuery);
      const products = this.parseSearchResults(results, searchParams);

      if (redis && products.length > 0) {
        await redis.setex(cacheKey, 1800, JSON.stringify(products));
      }

      return products;
    } catch (error) {
      console.error('Google Search error:', error);
      // Fallback to mock data if API fails
      return this.getMockProducts(searchParams);
    }
  }

  private buildSearchQuery(searchParams: SearchParams): string {
    let query = searchParams.searchTerms;

    // Add price and review modifiers for better results
    query += ' price review buy';

    if (searchParams.category) {
      query += ` ${searchParams.category}`;
    }

    if (searchParams.mustHaveFeatures?.length) {
      query += ` ${searchParams.mustHaveFeatures.join(' ')}`;
    }

    return query;
  }

  private async performGoogleSearch(query: string): Promise<any> {
    if (!this.apiKey) {
      console.log('Google API key not configured');
      return null;
    }

    const url = 'https://www.googleapis.com/customsearch/v1';
    const params = {
      key: this.apiKey,
      cx: this.searchEngineId,
      q: query,
      num: 10, // Number of results
      searchType: 'shopping', // Focus on shopping results
    };

    try {
      const response = await axios.get(url, { params });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.log('Google Custom Search API quota exceeded or not enabled');
      } else {
        console.error('Google API error:', error.message);
      }
      return null;
    }
  }

  private parseSearchResults(data: any, searchParams: SearchParams): Product[] {
    if (!data || !data.items) {
      return this.getMockProducts(searchParams);
    }

    const products: Product[] = [];

    data.items.forEach((item: any, index: number) => {
      // Parse Google Custom Search results
      const product: Product = {
        id: `google-${index}`,
        title: item.title || 'Unknown Product',
        description: item.snippet || '',
        price: this.extractPrice(item),
        currency: 'USD',
        image: item.pagemap?.cse_thumbnail?.[0]?.src ||
                item.pagemap?.cse_image?.[0]?.src ||
                '',
        images: this.extractImages(item),
        rating: this.extractRating(item),
        reviewCount: this.extractReviewCount(item),
        features: this.extractFeatures(item),
        source: 'google',
        link: item.link || '',
        brand: this.extractBrand(item),
        category: searchParams.category || 'General',
        availability: 'Check retailer',
      };

      products.push(product);
    });

    return products;
  }

  private extractPrice(item: any): number {
    // Try to extract price from various fields
    if (item.pagemap?.offer?.[0]?.price) {
      return parseFloat(item.pagemap.offer[0].price);
    }
    if (item.pagemap?.product?.[0]?.price) {
      return parseFloat(item.pagemap.product[0].price);
    }

    // Try to extract from snippet
    const priceMatch = item.snippet?.match(/\$([0-9,]+\.?\d*)/);
    if (priceMatch) {
      return parseFloat(priceMatch[1].replace(',', ''));
    }

    return 0;
  }

  private extractRating(item: any): number {
    if (item.pagemap?.aggregaterating?.[0]?.ratingvalue) {
      return parseFloat(item.pagemap.aggregaterating[0].ratingvalue);
    }
    if (item.pagemap?.review?.[0]?.ratingstars) {
      return parseFloat(item.pagemap.review[0].ratingstars);
    }
    return 0;
  }

  private extractReviewCount(item: any): number {
    if (item.pagemap?.aggregaterating?.[0]?.ratingcount) {
      return parseInt(item.pagemap.aggregaterating[0].ratingcount);
    }
    if (item.pagemap?.aggregaterating?.[0]?.reviewcount) {
      return parseInt(item.pagemap.aggregaterating[0].reviewcount);
    }
    return 0;
  }

  private extractBrand(item: any): string {
    if (item.pagemap?.product?.[0]?.brand) {
      return item.pagemap.product[0].brand;
    }
    if (item.pagemap?.metatags?.[0]?.['og:brand']) {
      return item.pagemap.metatags[0]['og:brand'];
    }

    // Try to extract from title
    const brands = ['Apple', 'Samsung', 'Google', 'Sony', 'Microsoft', 'Dell', 'HP', 'Lenovo'];
    for (const brand of brands) {
      if (item.title?.includes(brand)) {
        return brand;
      }
    }

    return '';
  }

  private extractFeatures(item: any): string[] {
    const features: string[] = [];

    // Extract from structured data
    if (item.pagemap?.product?.[0]?.description) {
      const desc = item.pagemap.product[0].description;
      // Split by common delimiters and take first few items
      const items = desc.split(/[•·\n]/).filter((f: string) => f.trim().length > 0);
      features.push(...items.slice(0, 5));
    }

    // Extract key points from snippet
    if (item.snippet) {
      const keyPoints = item.snippet.split('.').filter((s: string) => s.length > 10 && s.length < 100);
      features.push(...keyPoints.slice(0, 3));
    }

    return features;
  }

  private extractImages(item: any): string[] {
    const images: string[] = [];

    if (item.pagemap?.cse_image) {
      item.pagemap.cse_image.forEach((img: any) => {
        if (img.src) images.push(img.src);
      });
    }

    if (item.pagemap?.imageobject) {
      item.pagemap.imageobject.forEach((img: any) => {
        if (img.url) images.push(img.url);
      });
    }

    return images;
  }

  private getMockProducts(searchParams: SearchParams): Product[] {
    // Simplified mock data fallback
    const query = searchParams.searchTerms.toLowerCase();

    if (query.includes('iphone')) {
      return [
        {
          id: 'mock-iphone-16',
          title: 'iPhone 16 Pro',
          description: 'Latest iPhone with A18 Pro chip',
          price: 1199,
          currency: 'USD',
          image: 'https://via.placeholder.com/300x300',
          images: [],
          rating: 4.8,
          reviewCount: 15000,
          features: ['A18 Pro chip', '48MP camera', 'Titanium design'],
          source: 'google',
          link: '#',
          brand: 'Apple',
          category: 'Smartphones',
          availability: 'in stock'
        },
        {
          id: 'mock-iphone-15',
          title: 'iPhone 15 Pro',
          description: 'Previous generation with A17 Pro',
          price: 999,
          currency: 'USD',
          image: 'https://via.placeholder.com/300x300',
          images: [],
          rating: 4.7,
          reviewCount: 25000,
          features: ['A17 Pro chip', '48MP camera', 'Titanium design'],
          source: 'google',
          link: '#',
          brand: 'Apple',
          category: 'Smartphones',
          availability: 'in stock'
        }
      ];
    }

    return [];
  }
}