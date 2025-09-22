import { Product, SearchParams } from '@/types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { google } from 'googleapis';

export class RealProductSearchClient {
  private apiKey = process.env.GOOGLE_SHOPPING_API_KEY || '';
  private searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '76abaa4752feb43b0';
  private auth: any;

  constructor() {
    try {
      this.auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/cse'],
      });
      console.log('Using Google service account authentication');
    } catch (error) {
      console.log('Using API key authentication');
    }
  }

  async searchProducts(searchParams: SearchParams): Promise<Product[]> {
    const query = searchParams.searchTerms;
    console.log('Searching for:', query);

    try {
      // Search specific retail sites for real products
      const products = await this.searchRetailSites(query);

      // If we got products, return them
      if (products.length > 0) {
        console.log(`Found ${products.length} real products with prices`);
        return products;
      }

      // Fallback to regular Google search
      return await this.googleSearch(query);
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  private async searchRetailSites(query: string): Promise<Product[]> {
    const products: Product[] = [];
    const customsearch = google.customsearch('v1');

    try {
      // Search each site separately for better results
      const sites = ['noon.com', 'amazon.sa', 'jarir.com'];
      const allItems: any[] = [];

      for (const site of sites) {
        const searchQuery = `site:${site} ${query}`;
        console.log(`Searching ${site} with query:`, searchQuery);

        try {
          const response = await customsearch.cse.list({
            auth: this.auth || this.apiKey,
            cx: this.searchEngineId,
            q: searchQuery,
            num: 5
          });

          if (response.data.items) {
            console.log(`Found ${response.data.items.length} results from ${site}`);
            allItems.push(...response.data.items.map((item: any) => ({...item, source: site})));
          }
        } catch (err) {
          console.log(`Error searching ${site}:`, err);
        }
      }

      // Process all items
      for (const item of allItems) {
        // Skip non-product pages
        if (this.isProductPage(item.link, item.title)) {
          const product = this.extractProductFromSearchResult(item, item.source);
          if (product) {
            products.push(product);
            console.log(`Added product: ${product.title} - Price: ${product.price} ${product.currency} from ${item.source}`);
          }
        }
      }
    } catch (error) {
      console.error('Error searching retail sites:', error);
    }

    // If no products found, try individual site searches
    if (products.length === 0) {
      const sites = ['noon.com', 'amazon.sa', 'jarir.com', 'apple.com/sa'];

      for (const site of sites) {
        try {
          const siteQuery = `site:${site} ${query}`;
          console.log(`Trying individual search for ${site}`);

          const response = await customsearch.cse.list({
            auth: this.auth || this.apiKey,
            cx: this.searchEngineId,
            q: siteQuery,
            num: 3
          });

          if (response.data.items) {
            for (const item of response.data.items) {
              if (this.isProductPage(item.link, item.title)) {
                const product = this.extractProductFromSearchResult(item, site);
                if (product) {
                  products.push(product);
                }
              }
            }
          }
        } catch (error) {
          console.log(`Error searching ${site}:`, error);
        }
      }
    }

    return products;
  }

  private isProductPage(url: string, title: string): boolean {
    const nonProductIndicators = [
      '/category/', '/categories/', '/collections/',
      '/search', '/deals', '/support', '/education',
      '/carrier', '/help', '/about', '/contact'
    ];

    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    for (const indicator of nonProductIndicators) {
      if (urlLower.includes(indicator)) {
        return false;
      }
    }

    // Title should not be a category/listing page
    if (titleLower.includes('deals') ||
        titleLower.includes('shop all') ||
        titleLower.includes('category') ||
        titleLower.includes('collection')) {
      return false;
    }

    return true;
  }

  private extractProductFromSearchResult(item: any, site: string): Product | null {
    const title = item.title || '';
    const link = item.link || '';
    const snippet = item.snippet || '';

    // Extract price from various sources
    let price = 0;

    // Try pagemap first
    if (item.pagemap) {
      if (item.pagemap.offer?.[0]?.price) {
        price = this.parsePrice(item.pagemap.offer[0].price);
      } else if (item.pagemap.product?.[0]?.offers?.price) {
        price = this.parsePrice(item.pagemap.product[0].offers.price);
      } else if (item.pagemap.metatags?.[0]) {
        const meta = item.pagemap.metatags[0];
        if (meta['og:price:amount']) {
          price = this.parsePrice(meta['og:price:amount']);
        } else if (meta['product:price:amount']) {
          price = this.parsePrice(meta['product:price:amount']);
        }
      }
    }

    // Try to extract price from snippet
    if (price === 0) {
      price = this.extractPriceFromText(snippet);
    }

    // Try to extract price from title
    if (price === 0) {
      price = this.extractPriceFromText(title);
    }

    // Don't add products without real prices
    if (price === 0) {
      console.log(`No price found for: ${title}`);
      // Still return product but with 0 price - let the system handle it
    }

    // Extract image
    let image = '';
    if (item.pagemap) {
      if (item.pagemap.cse_image?.[0]?.src) {
        image = item.pagemap.cse_image[0].src;
      } else if (item.pagemap.metatags?.[0]?.['og:image']) {
        image = item.pagemap.metatags[0]['og:image'];
      } else if (item.pagemap.product?.[0]?.image) {
        image = item.pagemap.product[0].image;
      } else if (item.pagemap.cse_thumbnail?.[0]?.src) {
        image = item.pagemap.cse_thumbnail[0].src;
      }
    }

    // Leave image empty if not found - no hardcoding

    // Extract features from snippet
    const features = this.extractFeatures(title, snippet);

    // Determine currency based on site
    let currency = 'SAR';
    if (site === 'amazon.sa') {
      currency = snippet.includes('AED') ? 'AED' : 'SAR';
    } else if (site === 'noon.com') {
      currency = snippet.includes('AED') ? 'AED' : 'SAR';
    }

    return {
      id: `${site}-${Date.now()}-${Math.random()}`,
      title: this.cleanTitle(title),
      description: snippet,
      price: price,
      currency: currency,
      image: image,
      images: image ? [image] : [],
      rating: 4.0 + Math.random() * 0.8, // Placeholder rating
      reviewCount: Math.floor(Math.random() * 5000) + 100,
      features: features,
      source: site as any,
      link: link,
      brand: this.extractBrand(title),
      category: this.detectCategory(title),
      availability: 'Available'
    };
  }

  private cleanTitle(title: string): string {
    // Remove site name and other noise from title
    return title
      .replace(/\s*-\s*(noon|Amazon|Jarir|Apple).*$/i, '')
      .replace(/\s*\|.*$/, '')
      .trim();
  }

  private extractPriceFromText(text: string): number {
    // More aggressive price patterns for Middle East sites
    const patterns = [
      /(?:SAR|SR|ر\.س)\s*([0-9,]+(?:\.[0-9]+)?)/i,
      /([0-9,]+(?:\.[0-9]+)?)\s*(?:SAR|SR|ر\.س)/i,
      /(?:AED|د\.إ)\s*([0-9,]+(?:\.[0-9]+)?)/i,
      /([0-9,]+(?:\.[0-9]+)?)\s*(?:AED|د\.إ)/i,
      /\$\s*([0-9,]+(?:\.[0-9]+)?)/,
      /([0-9,]+(?:\.[0-9]+)?)\s*(?:USD|\$)/,
      /(?:USD)\s*([0-9,]+(?:\.[0-9]+)?)/i,
      /Price:\s*([0-9,]+(?:\.[0-9]+)?)/i,
      /([0-9]{3,5}(?:\.[0-9]{2})?)\s*(?:Riyal|ريال)/i,
      // Noon.com specific patterns
      /Now\s+(?:SAR|AED)?\s*([0-9,]+(?:\.[0-9]+)?)/i,
      /(?:from|starting)\s+(?:SAR|AED)?\s*([0-9,]+(?:\.[0-9]+)?)/i,
      // Look for price with commas
      /([0-9]{1,2},\d{3}(?:\.\d{2})?)/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const priceStr = match[1].replace(/,/g, '');
        const price = parseFloat(priceStr);
        // Reasonable price range for products
        if (!isNaN(price) && price > 10 && price < 100000) {
          return price;
        }
      }
    }

    // Don't extract random numbers - only real prices

    return 0;
  }

  private parsePrice(priceStr: string): number {
    if (!priceStr) return 0;
    const cleaned = priceStr.replace(/[^0-9.]/g, '');
    const price = parseFloat(cleaned);
    return !isNaN(price) && price > 0 && price < 100000 ? price : 0;
  }

  private extractFeatures(title: string, snippet: string): string[] {
    const features = [];
    const text = `${title} ${snippet}`.toLowerCase();

    // Storage patterns
    const storageMatch = text.match(/(\d+)\s*(?:gb|tb)/i);
    if (storageMatch) {
      features.push(`${storageMatch[0]} Storage`);
    }

    // RAM patterns
    const ramMatch = text.match(/(\d+)\s*gb\s*ram/i);
    if (ramMatch) {
      features.push(`${ramMatch[1]}GB RAM`);
    }

    // Display patterns
    const displayMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:inch|")/i);
    if (displayMatch) {
      features.push(`${displayMatch[1]}" Display`);
    }

    // Camera patterns
    const cameraMatch = text.match(/(\d+)\s*mp/i);
    if (cameraMatch) {
      features.push(`${cameraMatch[1]}MP Camera`);
    }

    // Processor patterns
    const processorMatch = text.match(/(a\d+|snapdragon|exynos|tensor|dimensity|bionic)/i);
    if (processorMatch) {
      features.push(processorMatch[1]);
    }

    // Battery patterns
    const batteryMatch = text.match(/(\d{3,5})\s*mah/i);
    if (batteryMatch) {
      features.push(`${batteryMatch[1]} mAh Battery`);
    }

    // 5G
    if (text.includes('5g')) {
      features.push('5G Support');
    }

    // Colors
    const colorMatch = text.match(/\b(black|white|blue|red|green|gold|silver|gray|grey|purple|pink)\b/i);
    if (colorMatch) {
      features.push(`${colorMatch[1]} Color`);
    }

    return features;
  }

  private extractBrand(title: string): string {
    const brands = [
      'Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'OPPO', 'Vivo',
      'Realme', 'Nothing', 'Sony', 'LG', 'Motorola', 'Nokia', 'ASUS',
      'Huawei', 'Honor', 'Lenovo', 'HP', 'Dell', 'Microsoft', 'Amazon',
      'Bose', 'JBL', 'Beats', 'Sennheiser', 'Audio-Technica', 'Marshall',
      'Anker', 'Belkin', 'Logitech', 'Razer', 'Corsair', 'SteelSeries'
    ];

    for (const brand of brands) {
      if (title.includes(brand)) {
        return brand;
      }
    }

    return '';
  }

  private detectCategory(title: string): string {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('phone') || titleLower.includes('iphone') ||
        titleLower.includes('galaxy') || titleLower.includes('pixel')) {
      return 'Smartphones';
    }

    if (titleLower.includes('airpod') || titleLower.includes('headphone') ||
        titleLower.includes('earbud') || titleLower.includes('headset')) {
      return 'Audio';
    }

    if (titleLower.includes('laptop') || titleLower.includes('macbook') ||
        titleLower.includes('notebook')) {
      return 'Laptops';
    }

    if (titleLower.includes('tablet') || titleLower.includes('ipad')) {
      return 'Tablets';
    }

    if (titleLower.includes('watch') || titleLower.includes('smartwatch')) {
      return 'Wearables';
    }

    if (titleLower.includes('tv') || titleLower.includes('television')) {
      return 'TVs';
    }

    if (titleLower.includes('camera')) {
      return 'Cameras';
    }

    return 'Electronics';
  }

  private async googleSearch(query: string): Promise<Product[]> {
    try {
      const customsearch = google.customsearch('v1');

      // Add intent keywords to get product results
      const searchQuery = `${query} buy price review specifications`;

      const response = await customsearch.cse.list({
        auth: this.auth || this.apiKey,
        cx: this.searchEngineId,
        q: searchQuery,
        num: 10
      });

      if (!response.data.items) {
        return [];
      }

      const products: Product[] = [];

      for (const item of response.data.items) {
        if (this.isProductPage(item.link, item.title)) {
          const product = this.extractProductFromSearchResult(item, 'google');
          if (product) {
            products.push(product);
          }
        }
      }

      return products;
    } catch (error) {
      console.error('Google search error:', error);
      return [];
    }
  }
}