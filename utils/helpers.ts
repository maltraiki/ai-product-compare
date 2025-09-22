import crypto from 'crypto';

export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

export function generateCacheKey(searchParams: any): string {
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(searchParams))
    .digest('hex');

  return `search:${hash.substring(0, 16)}`;
}

export function validateEnvironmentVariables(): {
  isValid: boolean;
  missingVars: string[];
  warnings: string[];
} {
  const required = [
    'CLAUDE_API_KEY',
  ];

  const optional = [
    'GOOGLE_SHOPPING_API_KEY',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GOOGLE_MERCHANT_ID',
    'AMAZON_ACCESS_KEY_ID',
    'AMAZON_SECRET_ACCESS_KEY',
    'AMAZON_ASSOCIATE_TAG',
    'REDIS_URL',
  ];

  const missingRequired = required.filter(key => !process.env[key]);
  const missingOptional = optional.filter(key => !process.env[key]);

  const warnings: string[] = [];

  if (missingOptional.includes('REDIS_URL')) {
    warnings.push('Redis not configured - caching disabled');
  }

  if (missingOptional.includes('GOOGLE_SHOPPING_API_KEY') ||
      missingOptional.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
    warnings.push('Google Shopping API not configured - using mock data');
  }

  if (missingOptional.includes('AMAZON_ACCESS_KEY_ID') ||
      missingOptional.includes('AMAZON_SECRET_ACCESS_KEY')) {
    warnings.push('Amazon API not configured - using mock data');
  }

  return {
    isValid: missingRequired.length === 0,
    missingVars: missingRequired,
    warnings,
  };
}

export function sanitizeUserInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .substring(0, 500);
}

export function trackAnalytics(event: string, data: any): void {
  if (process.env.NODE_ENV === 'production') {
    console.log('Analytics Event:', event, data);
  }
}

export function calculateProductScore(product: any): number {
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

  return score;
}

export function parseQueryString(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

export function calculateDiscount(originalPrice: number, currentPrice: number): number {
  if (originalPrice <= 0 || currentPrice <= 0 || currentPrice >= originalPrice) {
    return 0;
  }
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

export function sortProducts(
  products: any[],
  sortBy: 'price' | 'rating' | 'reviews' | 'discount' = 'rating'
): any[] {
  const sorted = [...products];

  switch (sortBy) {
    case 'price':
      return sorted.sort((a, b) => a.price - b.price);
    case 'rating':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'reviews':
      return sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    case 'discount':
      return sorted.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    default:
      return sorted;
  }
}

export function groupProductsByCategory(products: any[]): Record<string, any[]> {
  return products.reduce((acc, product) => {
    const category = product.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, any[]>);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function generateProductId(product: any): string {
  const source = product.source || 'unknown';
  const identifier = product.asin || product.offerId || product.id || Math.random().toString(36);
  return `${source}-${identifier}`;
}

export function normalizeImageUrl(url: string): string {
  if (!url || !isValidUrl(url)) {
    return '/placeholder.png';
  }
  return url;
}

export function getEnvironmentConfig() {
  return {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  };
}