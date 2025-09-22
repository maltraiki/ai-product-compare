import axios from 'axios';
import { google } from 'googleapis';
import { SearchParams, Product, GoogleShoppingProduct } from '@/types';
import Redis from 'ioredis';

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export class GoogleShoppingClient {
  private apiKey = process.env.GOOGLE_SHOPPING_API_KEY || '';
  private searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
  private customSearch: any;

  constructor() {
    // Try to use service account authentication first
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/cse'],
      });

      this.customSearch = google.customsearch({
        version: 'v1',
        auth,
      });
      console.log('Using Google service account authentication');
    } catch (error) {
      console.log('Service account not available, using API key');

      if (!this.apiKey) {
        console.log('Google API key not configured');
      }
      if (!this.searchEngineId) {
        console.log('Google Search Engine ID not configured');
      }
    }
  }

  async searchProducts(searchParams: SearchParams): Promise<Product[]> {
    const cacheKey = `google:${Buffer.from(
      JSON.stringify(searchParams)
    ).toString('base64')}`;

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    try {
      const products = await this.performSearch(searchParams);

      // Filter out non-product results and normalize
      if (products.length > 0) {
        const filteredProducts = this.filterValidProducts(products);
        const normalizedProducts = this.normalizeProducts(filteredProducts);

        if (redis && normalizedProducts.length > 0) {
          await redis.setex(cacheKey, 1800, JSON.stringify(normalizedProducts));
        }

        return normalizedProducts;
      }

      // No results found
      console.log('No Google results found');
      return [];
    } catch (error) {
      console.error('Google Shopping search error:', error);
      return [];
    }
  }

  private async performSearch(searchParams: SearchParams): Promise<any[]> {
    if (!this.searchEngineId) {
      console.log('Google Search Engine ID not configured');
      return [];
    }

    try {
      let query = searchParams.searchTerms;

      // Just add basic shopping intent
      query += ' price';

      if (searchParams.category) {
        query += ` ${searchParams.category}`;
      }

      console.log('Searching Google with query:', query);

      // Try using googleapis client with service account
      if (this.customSearch) {
        try {
          const res = await this.customSearch.cse.list({
            cx: this.searchEngineId,
            q: query,
            num: 10,
          });

          if (res.data && res.data.items) {
            console.log(`Found ${res.data.items.length} results from Google (service account)`);
            return this.parseCustomSearchResults(res.data.items);
          }
        } catch (serviceError: any) {
          console.log('Service account search failed:', serviceError.message);
          // Fall back to API key
        }
      }

      // Fall back to API key method
      if (!this.apiKey) {
        console.log('No API key available for fallback');
        return [];
      }

      const url = 'https://www.googleapis.com/customsearch/v1';
      const params = {
        key: this.apiKey,
        cx: this.searchEngineId,
        q: query,
        num: 10,
        safe: 'active'
      };

      const response = await axios.get(url, { params });

      if (response.data && response.data.items) {
        console.log(`Found ${response.data.items.length} results from Google (API key)`);
        return this.parseCustomSearchResults(response.data.items);
      }

      return [];
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.log('Google Custom Search API quota exceeded or API not enabled');
      } else if (error.response?.status === 400) {
        console.log('Invalid search parameters');
      } else {
        console.error('Google Custom Search error:', error.message);
      }
      return [];
    }
  }

  private filterValidProducts(products: any[]): any[] {
    return products.filter(product => {
      const title = (product.title || '').toLowerCase();
      const description = (product.description || product.snippet || '').toLowerCase();

      // Filter out accessories only
      const accessoryWords = [
        'case', 'cover', 'charger', 'cable', 'lanyard',
        'screen protector', 'adapter', 'holder', 'mount',
        'strap', 'stand', 'dock'
      ];

      for (const word of accessoryWords) {
        if (title.includes(word) || description.includes(word)) {
          return false;
        }
      }

      return true;
    });
  }

  private parseCustomSearchResults(items: any[]): any[] {
    return items.map((item, index) => {
      // Extract price from multiple sources
      let price = 0;

      // Try different price patterns
      const pricePatterns = [
        /\$([0-9,]+\.?\d*)/,           // $1,299
        /USD\s*([0-9,]+\.?\d*)/i,      // USD 1299
        /AED\s*([0-9,]+\.?\d*)/i,      // AED 4999 (for Noon.com)
        /Rs\.?\s*([0-9,]+\.?\d*)/i,    // Rs. 99999
        /€([0-9,]+\.?\d*)/,            // €999
        /£([0-9,]+\.?\d*)/,            // £899
        /Price:\s*([0-9,]+\.?\d*)/i,   // Price: 999
        /([0-9,]+\.?\d*)\s*USD/i,      // 999 USD
        /([0-9,]+\.?\d*)\s*AED/i,      // 4999 AED
      ];

      const searchText = `${item.title || ''} ${item.snippet || ''} ${item.htmlSnippet || ''}`;

      for (const pattern of pricePatterns) {
        const match = searchText.match(pattern);
        if (match) {
          price = parseFloat(match[1].replace(/,/g, ''));
          if (price > 0) break;
        }
      }

      // Check pagemap for price data
      if (price === 0 && item.pagemap) {
        if (item.pagemap.offer?.[0]?.price) {
          price = parseFloat(item.pagemap.offer[0].price.replace(/[^0-9.]/g, ''));
        } else if (item.pagemap.product?.[0]?.price) {
          price = parseFloat(item.pagemap.product[0].price.replace(/[^0-9.]/g, ''));
        } else if (item.pagemap.metatags?.[0]?.['product:price:amount']) {
          price = parseFloat(item.pagemap.metatags[0]['product:price:amount']);
        }
      }

      // Extract image from various possible locations in the search result
      let imageUrl = '';
      if (item.pagemap?.cse_image?.[0]?.src) {
        imageUrl = item.pagemap.cse_image[0].src;
      } else if (item.pagemap?.product?.[0]?.image) {
        imageUrl = item.pagemap.product[0].image;
      } else if (item.pagemap?.metatags?.[0]?.['og:image']) {
        imageUrl = item.pagemap.metatags[0]['og:image'];
      } else if (item.pagemap?.cse_thumbnail?.[0]?.src) {
        imageUrl = item.pagemap.cse_thumbnail[0].src;
      } else if (item.pagemap?.imageobject?.[0]?.url) {
        imageUrl = item.pagemap.imageobject[0].url;
      }

      // If still no image, don't use placeholder - let the UI handle it
      if (!imageUrl) {
        imageUrl = '';
      }

      // Extract specifications from metadata
      const specs = this.extractSpecifications(item);

      return {
        offerId: `google-${index}`,
        title: item.title || 'Unknown Product',
        description: item.snippet || '',
        link: item.link || '',
        imageLink: imageUrl,
        price: {
          value: price.toString(),
          currency: 'USD'
        },
        brand: this.extractBrand(item),
        availability: 'in stock',
        specifications: specs
      };
    });
  }

  private extractBrand(item: any): string {
    const title = item.title || '';
    const brands = ['Apple', 'Samsung', 'Google', 'Sony', 'Bose', 'Microsoft', 'Amazon', 'JBL', 'Beats', 'OnePlus', 'Xiaomi', 'OPPO', 'Vivo', 'Realme', 'Nothing', 'ASUS', 'Motorola', 'Nokia', 'LG'];

    for (const brand of brands) {
      if (title.includes(brand) || item.snippet?.includes(brand)) {
        return brand;
      }
    }
    return '';
  }

  private extractSpecifications(item: any): any {
    const specs: any = {};

    // Try to extract from pagemap metadata
    if (item.pagemap) {
      // Product metadata
      if (item.pagemap.product) {
        const product = item.pagemap.product[0];
        if (product.name) specs.productName = product.name;
        if (product.brand) specs.brand = product.brand;
        if (product.price) specs.price = product.price;
        if (product.description) specs.description = product.description;
      }

      // Metatags often contain specs
      if (item.pagemap.metatags) {
        const meta = item.pagemap.metatags[0];
        if (meta['og:title']) specs.title = meta['og:title'];
        if (meta['og:description']) specs.description = meta['og:description'];
        if (meta['product:price:amount']) specs.price = meta['product:price:amount'];
        if (meta['product:brand']) specs.brand = meta['product:brand'];
      }

      // Structured data
      if (item.pagemap.offer) {
        const offer = item.pagemap.offer[0];
        if (offer.price) specs.price = offer.price;
        if (offer.availability) specs.availability = offer.availability;
      }
    }

    // Extract specs from snippet
    const snippet = item.snippet || '';
    const title = item.title || '';
    const combined = `${title} ${snippet}`;

    // Display specs
    const screenMatch = combined.match(/(\d+\.?\d*)\s*(?:"|inch|\-inch)/i);
    if (screenMatch) specs.screenSize = `${screenMatch[1]} inch`;

    const resolutionMatch = combined.match(/(\d{3,4})\s*x\s*(\d{3,4})/i);
    if (resolutionMatch) specs.resolution = `${resolutionMatch[1]}x${resolutionMatch[2]}`;

    // Storage
    const storageMatch = combined.match(/(\d+)\s*(?:GB|TB)/i);
    if (storageMatch) specs.storage = `${storageMatch[1]}${storageMatch[2]}`;

    // RAM
    const ramMatch = combined.match(/(\d+)\s*GB\s*(?:RAM|Memory)/i);
    if (ramMatch) specs.ram = `${ramMatch[1]}GB`;

    // Camera
    const cameraMatch = combined.match(/(\d+)\s*(?:MP|megapixel)/i);
    if (cameraMatch) specs.camera = `${cameraMatch[1]}MP`;

    // Battery
    const batteryMatch = combined.match(/(\d{3,4})\s*mAh/i);
    if (batteryMatch) specs.battery = `${batteryMatch[1]} mAh`;

    // Processor
    const processorMatch = combined.match(/(A\d+|Snapdragon\s*\d+|Exynos\s*\d+|Tensor\s*G?\d*|Dimensity\s*\d+)/i);
    if (processorMatch) specs.processor = processorMatch[1];

    return specs;
  }

  private normalizeProducts(products: any[]): Product[] {
    return products.map((product, index) => {
      const features = this.extractFeaturesFromSpecs(product.specifications || {});

      return {
        id: `google-${product.offerId || index}`,
        title: product.title || 'Unknown Product',
        description: product.description || '',
        price: this.extractPrice(product),
        currency: product.price?.currency || 'USD',
        image: product.imageLink || '',
        images: this.extractImages(product),
        rating: 0,
        reviewCount: 0,
        features: features,
        source: 'google' as const,
        link: product.link || '',
        brand: product.brand,
        category: '',
        availability: product.availability,
        originalPrice: undefined,
        discount: undefined,
        technicalSpecs: this.buildTechnicalSpecs(product)
      };
    });
  }

  private extractFeaturesFromSpecs(specs: any): string[] {
    const features = [];
    if (specs.screenSize) features.push(`${specs.screenSize} display`);
    if (specs.processor) features.push(specs.processor);
    if (specs.storage) features.push(`${specs.storage} storage`);
    if (specs.ram) features.push(`${specs.ram} RAM`);
    if (specs.camera) features.push(`${specs.camera} camera`);
    if (specs.battery) features.push(`${specs.battery} battery`);
    if (specs.resolution) features.push(`${specs.resolution} resolution`);
    return features;
  }

  private buildTechnicalSpecs(product: any): any {
    const specs = product.specifications || {};
    const title = product.title || '';
    const description = product.description || '';

    // Determine product type
    const isPhone = title.toLowerCase().includes('phone') || title.toLowerCase().includes('iphone') || title.toLowerCase().includes('galaxy');
    const isHeadphone = title.toLowerCase().includes('airpod') || title.toLowerCase().includes('headphone') || title.toLowerCase().includes('earbud');

    if (isPhone) {
      return this.buildPhoneSpecs(product, specs);
    } else if (isHeadphone) {
      return this.buildAudioSpecs(product, specs);
    } else {
      return this.buildGenericSpecs(product, specs);
    }
  }

  private buildPhoneSpecs(product: any, specs: any): any {
    const title = product.title || '';
    const isIPhone = title.includes('iPhone');
    const model = title.match(/iPhone\s*(\d+)(?:\s*(Pro|Plus|Pro Max))?/i);

    return {
      display: {
        size: specs.screenSize || this.guessScreenSize(title),
        resolution: specs.resolution || this.guessResolution(title),
        technology: isIPhone ? 'Super Retina XDR OLED' : 'AMOLED',
        refreshRate: title.includes('Pro') ? '120Hz ProMotion' : '60Hz'
      },
      processor: {
        chipset: specs.processor || this.guessProcessor(title),
        ram: specs.ram || '6GB',
        storage: specs.storage ? [specs.storage] : ['128GB', '256GB', '512GB']
      },
      camera: {
        main: {
          megapixels: parseInt(specs.camera) || 48,
          aperture: 'f/1.6'
        }
      },
      battery: {
        capacity: specs.battery || this.guessBattery(title)
      },
      build: {
        materials: isIPhone && title.includes('Pro') ? ['Titanium', 'Ceramic Shield'] : ['Aluminum', 'Glass']
      }
    };
  }

  private buildAudioSpecs(product: any, specs: any): any {
    return {
      audio: {
        drivers: specs.drivers || 'Custom drivers',
        noiseCancellation: product.title.includes('Pro') ? 'Active Noise Cancellation' : 'None',
        batteryLife: specs.battery || '6 hours (24 hours with case)'
      }
    };
  }

  private buildGenericSpecs(product: any, specs: any): any {
    return specs;
  }

  private guessScreenSize(title: string): string {
    if (title.includes('Max') || title.includes('Ultra')) return '6.7 inches';
    if (title.includes('Plus')) return '6.7 inches';
    if (title.includes('Pro') && !title.includes('Max')) return '6.1 inches';
    if (title.includes('mini')) return '5.4 inches';
    return '6.1 inches';
  }

  private guessResolution(title: string): string {
    if (title.includes('Max') || title.includes('Ultra')) return '2796×1290 pixels';
    if (title.includes('Plus')) return '2778×1284 pixels';
    if (title.includes('Pro')) return '2532×1170 pixels';
    return '2532×1170 pixels';
  }

  private guessProcessor(title: string): string {
    const match = title.match(/iPhone\s*(\d+)/i);
    if (match) {
      const version = parseInt(match[1]);
      if (version >= 16) return 'A18 Pro Bionic';
      if (version === 15) return 'A17 Pro Bionic';
      if (version === 14) return 'A16 Bionic';
    }
    if (title.includes('Galaxy')) return 'Snapdragon 8 Gen 3';
    if (title.includes('Pixel')) return 'Tensor G4';
    return 'Latest processor';
  }

  private guessBattery(title: string): string {
    if (title.includes('Max') || title.includes('Ultra')) return '4422 mAh';
    if (title.includes('Plus')) return '4325 mAh';
    if (title.includes('Pro')) return '3274 mAh';
    return '3279 mAh';
  }

  private extractPrice(product: GoogleShoppingProduct): number {
    if (product.price?.value) {
      return parseFloat(product.price.value);
    }
    return 0;
  }

  private extractImages(product: GoogleShoppingProduct): string[] {
    const images = [];
    if (product.imageLink) images.push(product.imageLink);
    if (product.additionalImageLinks) {
      images.push(...product.additionalImageLinks);
    }
    return images;
  }

  private getMockProducts(searchParams: SearchParams): Product[] {
    // Completely remove mock products - only return empty array
    return [];
  }

  private DEPRECATED_getMockProducts(searchParams: SearchParams): Product[] {
    // Check what type of product is being searched for
    const query = searchParams.searchTerms.toLowerCase();

    // AirPods mock data
    if (query.includes('airpod') || query.includes('earpod') || query.includes('earphone') || query.includes('earbuds')) {
      return [
        {
          id: 'google-airpods-pro-2',
          title: 'Apple AirPods Pro (2nd generation)',
          description: 'Active Noise Cancellation, Personalized Spatial Audio, MagSafe Charging Case',
          price: 249.99,
          currency: 'USD',
          image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MQD83?wid=400&hei=400',
          images: ['https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MQD83?wid=400&hei=400'],
          rating: 4.6,
          reviewCount: 28453,
          features: [
            'Active Noise Cancellation',
            'Adaptive Transparency',
            'Personalized Spatial Audio',
            'H2 chip',
            'Up to 6 hours listening time',
            'MagSafe and wireless charging',
            'Sweat and water resistant',
          ],
          source: 'google',
          link: 'https://www.apple.com/airpods-pro/',
          brand: 'Apple',
          category: 'Audio',
          availability: 'in stock',
        },
        {
          id: 'google-airpods-3',
          title: 'Apple AirPods (3rd generation)',
          description: 'Personalized Spatial Audio, sweat and water resistant, up to 6 hours listening',
          price: 169.99,
          currency: 'USD',
          image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MME73?wid=400&hei=400',
          images: ['https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MME73?wid=400&hei=400'],
          rating: 4.4,
          reviewCount: 15234,
          features: [
            'Personalized Spatial Audio',
            'Force sensor controls',
            'Sweat and water resistant',
            'Up to 6 hours listening time',
            'Lightning Charging Case',
            'Automatic switching',
          ],
          source: 'google',
          link: 'https://www.apple.com/airpods-3rd-generation/',
          brand: 'Apple',
          category: 'Audio',
          availability: 'in stock',
        },
      ];
    }

    // iPhone mock data
    if (query.includes('iphone') || query.includes('smartphone') || query.includes('phone')) {
      return [
        {
          id: 'google-iphone-16-pro',
          title: 'Apple iPhone 16 Pro Max',
          description: 'Latest flagship with A18 Pro chip and advanced camera system',
          price: 1199.99,
          currency: 'USD',
          image: 'https://via.placeholder.com/300x300/000000/FFFFFF?text=iPhone+16+Pro',
          images: ['https://via.placeholder.com/300x300/000000/FFFFFF?text=iPhone+16+Pro'],
          rating: 4.8,
          reviewCount: 15234,
          features: [
            'A18 Pro chip',
            '48MP main camera with 5x telephoto',
            'Action button',
            'Titanium design',
            'USB-C port',
            'Dynamic Island',
            'ProMotion 120Hz display',
            '6.7-inch Super Retina XDR',
          ],
          source: 'google',
          link: 'https://store.google.com/iphone16pro',
          brand: 'Apple',
          category: 'Smartphones',
          availability: 'in stock',
        },
        {
          id: 'google-iphone-15-pro',
          title: 'Apple iPhone 15 Pro Max',
          description: 'Previous generation Pro with A17 Pro chip',
          price: 999.99,
          currency: 'USD',
          image: 'https://via.placeholder.com/300x300/333333/FFFFFF?text=iPhone+15+Pro',
          images: ['https://via.placeholder.com/300x300/333333/FFFFFF?text=iPhone+15+Pro'],
          rating: 4.7,
          reviewCount: 28453,
          features: [
            'A17 Pro chip',
            '48MP main camera',
            'Action button',
            'Titanium design',
            'USB-C port',
            'Dynamic Island',
            'ProMotion 120Hz display',
            '6.7-inch Super Retina XDR',
          ],
          source: 'google',
          link: 'https://store.google.com/iphone15pro',
          brand: 'Apple',
          category: 'Smartphones',
          availability: 'in stock',
          originalPrice: 1199.99,
          discount: 17,
        },
        {
          id: 'google-iphone-16',
          title: 'Apple iPhone 16',
          description: 'Latest standard iPhone with A18 chip',
          price: 799.99,
          currency: 'USD',
          image: 'https://via.placeholder.com/300x300/0066CC/FFFFFF?text=iPhone+16',
          images: ['https://via.placeholder.com/300x300/0066CC/FFFFFF?text=iPhone+16'],
          rating: 4.6,
          reviewCount: 8924,
          features: [
            'A18 chip',
            '48MP main camera',
            'Camera Control button',
            'Aluminum design',
            'USB-C port',
            'Dynamic Island',
            '60Hz display',
            '6.1-inch Super Retina XDR',
          ],
          source: 'google',
          link: 'https://store.google.com/iphone16',
          brand: 'Apple',
          category: 'Smartphones',
          availability: 'in stock',
        },
      ];
    }

    // Default headphones mock data
    const mockProducts: Product[] = [
      {
        id: 'google-mock-1',
        title: 'Premium Wireless Headphones',
        description: 'High-quality wireless headphones with active noise cancellation',
        price: 299.99,
        currency: 'USD',
        image: 'https://via.placeholder.com/300x300',
        images: ['https://via.placeholder.com/300x300'],
        rating: 4.5,
        reviewCount: 1250,
        features: [
          'Active Noise Cancellation',
          '30-hour battery life',
          'Bluetooth 5.0',
          'Premium sound quality',
        ],
        source: 'google',
        link: 'https://example.com/product1',
        brand: 'AudioTech',
        category: 'Electronics',
        availability: 'in stock',
      },
      {
        id: 'google-mock-2',
        title: 'Professional Wireless Headset',
        description: 'Business-grade wireless headset with superior comfort',
        price: 249.99,
        currency: 'USD',
        image: 'https://via.placeholder.com/300x300',
        images: ['https://via.placeholder.com/300x300'],
        rating: 4.3,
        reviewCount: 892,
        features: [
          'Noise-canceling microphone',
          '25-hour battery life',
          'Multi-device connectivity',
          'Lightweight design',
        ],
        source: 'google',
        link: 'https://example.com/product2',
        brand: 'ProSound',
        category: 'Electronics',
        availability: 'in stock',
        originalPrice: 299.99,
        discount: 17,
      },
      {
        id: 'google-mock-3',
        title: 'Budget Wireless Earbuds',
        description: 'Affordable wireless earbuds with good sound quality',
        price: 79.99,
        currency: 'USD',
        image: 'https://via.placeholder.com/300x300',
        images: ['https://via.placeholder.com/300x300'],
        rating: 4.0,
        reviewCount: 3421,
        features: [
          'True wireless design',
          '20-hour total battery',
          'Water resistant',
          'Touch controls',
        ],
        source: 'google',
        link: 'https://example.com/product3',
        brand: 'SoundWave',
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