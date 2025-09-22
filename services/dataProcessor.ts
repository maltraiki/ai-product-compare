import { Product, CacheEntry } from '@/types';
import Redis from 'ioredis';
import crypto from 'crypto';

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export class DataProcessor {
  async aggregateProductData(
    googleResults: Product[],
    amazonResults: Product[]
  ): Promise<Product[]> {
    const allProducts = [...googleResults, ...amazonResults];
    const deduplicatedProducts = this.deduplicateProducts(allProducts);
    const enrichedProducts = await this.enrichProductData(deduplicatedProducts);

    return enrichedProducts.sort((a, b) => {
      const scoreA = this.calculateProductScore(a);
      const scoreB = this.calculateProductScore(b);
      return scoreB - scoreA;
    });
  }

  deduplicateProducts(products: Product[]): Product[] {
    const uniqueProducts = new Map<string, Product>();
    const titleSimilarityThreshold = 0.8;

    products.forEach(product => {
      let isDuplicate = false;

      for (const [key, existingProduct] of Array.from(uniqueProducts.entries())) {
        const similarity = this.calculateSimilarity(
          product.title.toLowerCase(),
          existingProduct.title.toLowerCase()
        );

        if (similarity >= titleSimilarityThreshold) {
          isDuplicate = true;
          const mergedProduct = this.mergeProducts(existingProduct, product);
          uniqueProducts.set(key, mergedProduct);
          break;
        }
      }

      if (!isDuplicate) {
        const key = this.generateProductKey(product);
        uniqueProducts.set(key, product);
      }
    });

    return Array.from(uniqueProducts.values());
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));

    const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
    const union = new Set([...Array.from(words1), ...Array.from(words2)]);

    return intersection.size / union.size;
  }

  private mergeProducts(product1: Product, product2: Product): Product {
    const merged: Product = { ...product1 };

    if (!merged.rating && product2.rating) {
      merged.rating = product2.rating;
      merged.reviewCount = product2.reviewCount;
    } else if (product2.rating && merged.rating) {
      merged.rating = (merged.rating + product2.rating) / 2;
      merged.reviewCount = Math.max(merged.reviewCount, product2.reviewCount);
    }

    if (product2.features && product2.features.length > merged.features.length) {
      merged.features = Array.from(new Set([...merged.features, ...product2.features]));
    }

    if (!merged.description && product2.description) {
      merged.description = product2.description;
    }

    if (product2.images && product2.images.length > 0) {
      merged.images = Array.from(new Set([...(merged.images || []), ...product2.images]));
    }

    if (product2.source === 'amazon' && product2.affiliateLink) {
      merged.affiliateLink = product2.affiliateLink;
      merged.asin = product2.asin;
    }

    if (product2.price && (!merged.price || product2.price < merged.price)) {
      merged.price = product2.price;
      merged.originalPrice = product2.originalPrice;
      merged.discount = product2.discount;
    }

    return merged;
  }

  private generateProductKey(product: Product): string {
    const normalizedTitle = product.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 30);

    return crypto
      .createHash('md5')
      .update(normalizedTitle + (product.brand || ''))
      .digest('hex');
  }

  async enrichProductData(products: Product[]): Promise<Product[]> {
    return products.map(product => {
      const enriched = { ...product };

      if (!enriched.pros || enriched.pros.length === 0) {
        enriched.pros = this.generatePros(product);
      }

      if (!enriched.cons || enriched.cons.length === 0) {
        enriched.cons = this.generateCons(product);
      }

      if (enriched.discount && enriched.discount > 10) {
        enriched.features = [
          `${enriched.discount}% OFF - Limited Time`,
          ...(enriched.features || [])
        ];
      }

      if (enriched.rating >= 4.5 && enriched.reviewCount > 1000) {
        enriched.features = [
          'Top Rated by Customers',
          ...(enriched.features || [])
        ];
      }

      return enriched;
    });
  }

  private generatePros(product: Product): string[] {
    const pros = [];

    if (product.rating >= 4.5) {
      pros.push('Highly rated by customers');
    }
    if (product.reviewCount > 1000) {
      pros.push('Extensively reviewed and tested');
    }
    if (product.discount && product.discount > 15) {
      pros.push(`Great value with ${product.discount}% discount`);
    }
    if (product.features && product.features.length > 5) {
      pros.push('Feature-rich product');
    }
    if (product.brand) {
      pros.push(`Trusted ${product.brand} brand`);
    }

    return pros.length > 0 ? pros : ['Good value for money'];
  }

  private generateCons(product: Product): string[] {
    const cons = [];

    if (product.rating < 3.5 && product.rating > 0) {
      cons.push('Mixed customer reviews');
    }
    if (product.reviewCount < 100 && product.reviewCount > 0) {
      cons.push('Limited customer feedback');
    }
    if (product.price > 500) {
      cons.push('Premium pricing');
    }
    if (!product.discount || product.discount < 5) {
      cons.push('No significant discounts available');
    }
    if (!product.features || product.features.length < 3) {
      cons.push('Basic feature set');
    }

    return cons.length > 0 ? cons : ['May have better alternatives'];
  }

  private calculateProductScore(product: Product): number {
    let score = 0;

    score += (product.rating || 0) * 20;

    if (product.reviewCount) {
      score += Math.min(product.reviewCount / 100, 10);
    }

    if (product.discount) {
      score += product.discount / 2;
    }

    if (product.features) {
      score += Math.min(product.features.length * 2, 10);
    }

    if (product.price && product.price < 100) {
      score += 5;
    } else if (product.price && product.price < 300) {
      score += 3;
    }

    if (product.source === 'amazon' && product.affiliateLink) {
      score += 5;
    }

    return score;
  }

  async cacheResults(cacheKey: string, data: any, ttl: number): Promise<void> {
    if (!redis) {
      console.log('Redis not configured, skipping cache');
      return;
    }

    try {
      const cacheEntry: CacheEntry<any> = {
        data,
        timestamp: Date.now(),
        ttl
      };

      await redis.setex(cacheKey, ttl, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  async getCachedResults(cacheKey: string): Promise<any | null> {
    if (!redis) {
      return null;
    }

    try {
      const cached = await redis.get(cacheKey);
      if (!cached) {
        return null;
      }

      const cacheEntry: CacheEntry<any> = JSON.parse(cached);
      const age = Date.now() - cacheEntry.timestamp;

      if (age > cacheEntry.ttl * 1000) {
        await redis.del(cacheKey);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  generateCacheKey(data: any): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');

    return `cache:${hash.substring(0, 16)}`;
  }
}