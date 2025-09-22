import aws4 from 'aws4';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { SearchParams, Product, AmazonProduct } from '@/types';
import Redis from 'ioredis';

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export class AmazonAPIClient {
  private host = 'webservices.amazon.com';
  private region = 'us-east-1';
  private service = 'ProductAdvertisingAPI';
  private lastRequestTime: number = 0;
  private requestDelay = 10000;

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise(resolve =>
        setTimeout(resolve, this.requestDelay - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();
  }

  async searchItems(searchParams: SearchParams): Promise<Product[]> {
    const cacheKey = `amazon:${Buffer.from(
      JSON.stringify(searchParams)
    ).toString('base64')}`;

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    try {
      await this.enforceRateLimit();
      const products = await this.performSearch(searchParams);

      // Only return real Amazon products, no mock data
      if (products.length === 0) {
        console.log('No Amazon products found (API not configured)');
        return []; // Return empty instead of mock data
      }

      const normalizedProducts = this.normalizeProducts(products);

      if (redis && normalizedProducts.length > 0) {
        await redis.setex(cacheKey, 1800, JSON.stringify(normalizedProducts));
      }

      return normalizedProducts;
    } catch (error) {
      console.error('Amazon API search error:', error);
      // Return empty array instead of mock data
      return [];
    }
  }

  private async performSearch(searchParams: SearchParams): Promise<AmazonProduct[]> {
    const accessKeyId = process.env.AMAZON_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AMAZON_SECRET_ACCESS_KEY;
    const associateTag = process.env.AMAZON_ASSOCIATE_TAG;

    if (!accessKeyId || !secretAccessKey || !associateTag) {
      console.log('Amazon API credentials not configured, using mock data');
      return [];
    }

    try {
      const request = {
        Keywords: searchParams.searchTerms,
        SearchIndex: this.mapCategoryToSearchIndex(searchParams.category),
        Resources: [
          'Images.Primary.Large',
          'Images.Variants',
          'ItemInfo.Title',
          'ItemInfo.Features',
          'ItemInfo.ByLineInfo',
          'Offers.Listings.Price',
          'CustomerReviews.StarRating',
          'CustomerReviews.Count',
        ],
        ItemCount: 10,
        PartnerTag: associateTag,
        PartnerType: 'Associates',
        Marketplace: 'www.amazon.com',
        Operation: 'SearchItems',
      };

      if (searchParams.priceRange?.min) {
        (request as any).MinPrice = searchParams.priceRange.min * 100;
      }
      if (searchParams.priceRange?.max) {
        (request as any).MaxPrice = searchParams.priceRange.max * 100;
      }

      const signedRequest = aws4.sign(
        {
          host: this.host,
          path: '/paapi5/searchitems',
          service: this.service,
          region: this.region,
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-amz-target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
          },
          body: JSON.stringify(request),
        },
        {
          accessKeyId,
          secretAccessKey,
        }
      );

      const response = await axios.post(
        `https://${this.host}/paapi5/searchitems`,
        signedRequest.body,
        { headers: signedRequest.headers as any }
      );

      return response.data.SearchResult?.Items || [];
    } catch (error: any) {
      console.error('Amazon API request failed:', error.message);
      return [];
    }
  }

  private mapCategoryToSearchIndex(category?: string): string {
    const categoryMap: { [key: string]: string } = {
      electronics: 'Electronics',
      books: 'Books',
      clothing: 'Apparel',
      home: 'HomeAndKitchen',
      sports: 'SportingGoods',
      toys: 'Toys',
      beauty: 'Beauty',
      automotive: 'Automotive',
    };

    return categoryMap[category?.toLowerCase() || ''] || 'All';
  }

  private normalizeProducts(products: AmazonProduct[]): Product[] {
    return products.map((product, index) => ({
      id: `amazon-${product.ASIN || index}`,
      title: product.ItemInfo?.Title?.DisplayValue || 'Unknown Product',
      description: this.extractDescription(product),
      price: this.extractPrice(product),
      currency: 'USD',
      image: product.Images?.Primary?.Large?.URL || '',
      images: this.extractImages(product),
      rating: product.CustomerReviews?.StarRating?.Value || 0,
      reviewCount: product.CustomerReviews?.Count || 0,
      features: product.ItemInfo?.Features?.DisplayValues || [],
      source: 'amazon',
      link: product.DetailPageURL || '',
      affiliateLink: this.generateAffiliateLink(product),
      asin: product.ASIN,
      brand: product.ItemInfo?.ByLineInfo?.Brand?.DisplayValue,
      category: '',
      availability: 'in stock',
      originalPrice: this.extractOriginalPrice(product),
      discount: this.calculateDiscount(product),
    }));
  }

  private extractDescription(product: AmazonProduct): string {
    const features = product.ItemInfo?.Features?.DisplayValues || [];
    return features.slice(0, 3).join('. ');
  }

  private extractPrice(product: AmazonProduct): number {
    const listing = product.Offers?.Listings?.[0];
    return listing?.Price?.Amount || 0;
  }

  private extractOriginalPrice(product: AmazonProduct): number | undefined {
    const listing = product.Offers?.Listings?.[0];
    return listing?.SavingBasis?.Amount;
  }

  private calculateDiscount(product: AmazonProduct): number | undefined {
    const listing = product.Offers?.Listings?.[0];
    const current = listing?.Price?.Amount;
    const original = listing?.SavingBasis?.Amount;

    if (current && original && original > current) {
      return Math.round(((original - current) / original) * 100);
    }
    return undefined;
  }

  private extractImages(product: AmazonProduct): string[] {
    const images = [];

    if (product.Images?.Primary?.Large?.URL) {
      images.push(product.Images.Primary.Large.URL);
    }

    if (product.Images?.Variants) {
      product.Images.Variants.forEach(variant => {
        if (variant.Large?.URL) {
          images.push(variant.Large.URL);
        }
      });
    }

    return images;
  }

  private generateAffiliateLink(product: AmazonProduct): string {
    const associateTag = process.env.AMAZON_ASSOCIATE_TAG;
    if (!associateTag || !product.ASIN) {
      return product.DetailPageURL || '';
    }

    return `https://www.amazon.com/dp/${product.ASIN}?tag=${associateTag}`;
  }

  private getMockProducts(searchParams: SearchParams): Product[] {
    // Check what type of product is being searched for
    const query = searchParams.searchTerms.toLowerCase();

    // iPhone mock data
    if (query.includes('iphone') || query.includes('smartphone') || query.includes('phone')) {
      return [
        {
          id: 'amazon-iphone-15',
          title: 'Apple iPhone 15',
          description: 'Standard iPhone 15 with A16 Bionic chip',
          price: 699.99,
          currency: 'USD',
          image: 'https://via.placeholder.com/300x300/FF69B4/FFFFFF?text=iPhone+15',
          images: ['https://via.placeholder.com/300x300/FF69B4/FFFFFF?text=iPhone+15'],
          rating: 4.5,
          reviewCount: 42318,
          features: [
            'A16 Bionic chip',
            '48MP main camera',
            'Dynamic Island',
            'Aluminum design',
            'USB-C port',
            '60Hz display',
            '6.1-inch Super Retina XDR',
            'All-day battery life',
          ],
          pros: [
            'Excellent performance',
            'Great camera system',
            'USB-C finally included',
          ],
          cons: [
            'No ProMotion display',
            'No telephoto lens',
          ],
          source: 'amazon',
          link: 'https://amazon.com/iphone15',
          affiliateLink: 'https://amazon.com/iphone15?tag=test',
          asin: 'B0CGY5N4MN',
          brand: 'Apple',
          category: 'Smartphones',
          availability: 'in stock',
          originalPrice: 799.99,
          discount: 13,
        },
        {
          id: 'amazon-iphone-16-plus',
          title: 'Apple iPhone 16 Plus',
          description: 'Larger iPhone 16 with extended battery life',
          price: 899.99,
          currency: 'USD',
          image: 'https://via.placeholder.com/300x300/008080/FFFFFF?text=iPhone+16+Plus',
          images: ['https://via.placeholder.com/300x300/008080/FFFFFF?text=iPhone+16+Plus'],
          rating: 4.7,
          reviewCount: 5632,
          features: [
            'A18 chip',
            '48MP main camera',
            'Camera Control button',
            'Aluminum design',
            'USB-C port',
            'Dynamic Island',
            '60Hz display',
            '6.7-inch Super Retina XDR',
            'Best battery life in standard iPhone',
          ],
          pros: [
            'Excellent battery life',
            'Large display',
            'Latest A18 chip',
            'Camera Control button',
          ],
          cons: [
            'No ProMotion display',
            'No telephoto camera',
            'Heavy for some users',
          ],
          source: 'amazon',
          link: 'https://amazon.com/iphone16plus',
          affiliateLink: 'https://amazon.com/iphone16plus?tag=test',
          asin: 'B0DHJVW5ZW',
          brand: 'Apple',
          category: 'Smartphones',
          availability: 'in stock',
        },
        {
          id: 'amazon-iphone-15-plus',
          title: 'Apple iPhone 15 Plus',
          description: 'Large screen iPhone 15 with extended battery',
          price: 799.99,
          currency: 'USD',
          image: 'https://via.placeholder.com/300x300/9370DB/FFFFFF?text=iPhone+15+Plus',
          images: ['https://via.placeholder.com/300x300/9370DB/FFFFFF?text=iPhone+15+Plus'],
          rating: 4.4,
          reviewCount: 18924,
          features: [
            'A16 Bionic chip',
            '48MP main camera',
            'Dynamic Island',
            'Aluminum design',
            'USB-C port',
            '60Hz display',
            '6.7-inch Super Retina XDR',
            'Longest battery life',
          ],
          pros: [
            'Great battery life',
            'Big beautiful display',
            'Good value for large iPhone',
          ],
          cons: [
            'No ProMotion',
            'Previous gen chip',
          ],
          source: 'amazon',
          link: 'https://amazon.com/iphone15plus',
          affiliateLink: 'https://amazon.com/iphone15plus?tag=test',
          asin: 'B0CGY7XX2H',
          brand: 'Apple',
          category: 'Smartphones',
          availability: 'in stock',
          originalPrice: 899.99,
          discount: 11,
        },
      ];
    }

    // Default headphones mock data
    const mockProducts: Product[] = [
      {
        id: 'amazon-mock-1',
        title: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
        description: 'Industry-leading noise cancellation with Auto NC Optimizer',
        price: 398.00,
        currency: 'USD',
        image: 'https://via.placeholder.com/300x300',
        images: ['https://via.placeholder.com/300x300'],
        rating: 4.4,
        reviewCount: 8532,
        features: [
          'Industry-leading noise cancellation',
          'Up to 30-hour battery life',
          'Multipoint connection',
          'Speak-to-chat technology',
          'Premium comfort',
        ],
        pros: [
          'Exceptional noise cancellation',
          'Outstanding sound quality',
          'Comfortable for long wear',
        ],
        cons: [
          'Premium price point',
          'Case could be more compact',
        ],
        source: 'amazon',
        link: 'https://amazon.com/product1',
        affiliateLink: 'https://amazon.com/product1?tag=test',
        asin: 'B09XS7JWHH',
        brand: 'Sony',
        category: 'Electronics',
        availability: 'in stock',
      },
      {
        id: 'amazon-mock-2',
        title: 'Bose QuietComfort 45 Bluetooth Wireless Headphones',
        description: 'Noise cancelling headphones with personalized sound',
        price: 329.00,
        currency: 'USD',
        image: 'https://via.placeholder.com/300x300',
        images: ['https://via.placeholder.com/300x300'],
        rating: 4.3,
        reviewCount: 12847,
        features: [
          'World-class noise cancellation',
          '24-hour battery life',
          'Aware Mode',
          'Adjustable EQ',
          'Multi-device connectivity',
        ],
        pros: [
          'Excellent comfort',
          'Great noise cancellation',
          'Reliable Bluetooth connectivity',
        ],
        cons: [
          'Sound quality could be better',
          'No auto-pause feature',
        ],
        source: 'amazon',
        link: 'https://amazon.com/product2',
        affiliateLink: 'https://amazon.com/product2?tag=test',
        asin: 'B098FKXT8L',
        brand: 'Bose',
        category: 'Electronics',
        availability: 'in stock',
        originalPrice: 379.00,
        discount: 13,
      },
      {
        id: 'amazon-mock-3',
        title: 'Apple AirPods Pro (2nd Generation)',
        description: 'Active Noise Cancellation and Personalized Spatial Audio',
        price: 249.00,
        currency: 'USD',
        image: 'https://via.placeholder.com/300x300',
        images: ['https://via.placeholder.com/300x300'],
        rating: 4.5,
        reviewCount: 24683,
        features: [
          'Active Noise Cancellation',
          'Adaptive Transparency',
          'Personalized Spatial Audio',
          'MagSafe charging case',
          'Up to 6 hours listening time',
        ],
        pros: [
          'Excellent iOS integration',
          'Compact and portable',
          'Great noise cancellation for earbuds',
        ],
        cons: [
          'Limited Android features',
          'Shorter battery life than over-ear',
        ],
        source: 'amazon',
        link: 'https://amazon.com/product3',
        affiliateLink: 'https://amazon.com/product3?tag=test',
        asin: 'B0D1XD1ZV3',
        brand: 'Apple',
        category: 'Electronics',
        availability: 'in stock',
      },
    ];

    return mockProducts.filter(product => {
      if (searchParams.priceRange) {
        if (searchParams.priceRange.min && product.price < searchParams.priceRange.min) {
          return false;
        }
        if (searchParams.priceRange.max && product.price > searchParams.priceRange.max) {
          return false;
        }
      }
      return true;
    });
  }
}