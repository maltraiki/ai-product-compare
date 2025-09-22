export interface TechnicalSpecs {
  // Display specifications
  display?: {
    size?: string; // e.g., "6.3 inches"
    resolution?: string; // e.g., "2622×1206 pixels"
    ppi?: number; // pixels per inch
    technology?: string; // e.g., "Super Retina XDR OLED"
    refreshRate?: string; // e.g., "120Hz"
    brightness?: string; // e.g., "1000 nits typical, 2000 nits peak"
    contrastRatio?: string; // e.g., "2,000,000:1"
    colorGamut?: string; // e.g., "P3 wide color"
  };

  // Processor specifications
  processor?: {
    chipset?: string; // e.g., "A18 Pro"
    cpu?: string; // e.g., "6-core (2 performance + 4 efficiency)"
    gpu?: string; // e.g., "6-core GPU"
    process?: string; // e.g., "3nm"
    ram?: string; // e.g., "8GB"
    storage?: string[]; // e.g., ["128GB", "256GB", "512GB", "1TB"]
    benchmarkScore?: number; // e.g., AnTuTu score
  };

  // Camera specifications
  camera?: {
    main?: {
      megapixels?: number; // e.g., 48
      aperture?: string; // e.g., "f/1.78"
      sensorSize?: string; // e.g., "1/1.28\""
      stabilization?: string; // e.g., "sensor-shift OIS"
      features?: string[]; // e.g., ["Night mode", "Deep Fusion"]
    };
    ultrawide?: {
      megapixels?: number;
      aperture?: string;
      fieldOfView?: string; // e.g., "120°"
    };
    telephoto?: {
      megapixels?: number;
      aperture?: string;
      zoom?: string; // e.g., "5x optical"
    };
    front?: {
      megapixels?: number;
      aperture?: string;
      features?: string[];
    };
    video?: {
      maxResolution?: string; // e.g., "4K at 120fps"
      features?: string[]; // e.g., ["Dolby Vision", "ProRes"]
    };
  };

  // Battery specifications
  battery?: {
    capacity?: string; // e.g., "3274 mAh"
    wiredCharging?: string; // e.g., "27W"
    wirelessCharging?: string; // e.g., "15W MagSafe"
    batteryLife?: {
      videoPlayback?: string; // e.g., "27 hours"
      audioPlayback?: string; // e.g., "100 hours"
      screenOnTime?: string; // e.g., "8-10 hours"
    };
  };

  // Build and design
  build?: {
    materials?: string[]; // e.g., ["Titanium", "Ceramic Shield"]
    dimensions?: string; // e.g., "159.9×76.7×8.25 mm"
    weight?: string; // e.g., "227g"
    waterResistance?: string; // e.g., "IP68"
    colors?: string[]; // e.g., ["Natural Titanium", "Blue Titanium"]
  };

  // Connectivity
  connectivity?: {
    cellular?: string[]; // e.g., ["5G sub-6GHz", "5G mmWave"]
    wifi?: string; // e.g., "Wi-Fi 7 (802.11be)"
    bluetooth?: string; // e.g., "Bluetooth 5.3"
    nfc?: boolean;
    usb?: string; // e.g., "USB-C 3.0"
    satelliteEmergency?: boolean;
  };

  // Software
  software?: {
    os?: string; // e.g., "iOS 18"
    updateSupport?: string; // e.g., "5+ years"
    exclusiveFeatures?: string[]; // e.g., ["Apple Intelligence", "StandBy mode"]
  };

  // Audio
  audio?: {
    speakers?: string; // e.g., "Stereo speakers"
    audioFeatures?: string[]; // e.g., ["Spatial Audio", "Dolby Atmos"]
    headphoneJack?: boolean;
  };

  // Additional features
  additionalFeatures?: {
    biometrics?: string[]; // e.g., ["Face ID", "Fingerprint"]
    sensors?: string[]; // e.g., ["LiDAR", "Accelerometer"]
    specialFeatures?: string[]; // e.g., ["Action Button", "Camera Control"]
  };
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  images?: string[];
  rating: number;
  reviewCount: number;
  features: string[];
  pros?: string[];
  cons?: string[];
  source: 'google' | 'amazon';
  link: string;
  affiliateLink?: string;
  asin?: string;
  brand?: string;
  category?: string;
  availability?: string;
  originalPrice?: number;
  discount?: number;
  technicalSpecs?: TechnicalSpecs;
}

export interface SearchParams {
  searchTerms: string;
  category?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  mustHaveFeatures?: string[];
  userPriorities?: string[];
  excludeTerms?: string[];
}

export interface UserPreferences {
  priorities: string[];
  budget?: {
    min: number;
    max: number;
  };
  requiredFeatures?: string[];
  excludedItems?: string[];
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface SpecComparison {
  winner: string;
  comparison: string;
  scores: { [productId: string]: number }; // 0-100 score for each product
  details: string; // Detailed technical explanation
}

export interface PerformanceAnalysis {
  category: string;
  winner: string;
  scores: { [productId: string]: number };
  realWorldTesting: string;
  benchmarkData?: { [productId: string]: number };
}

export interface ValueAnalysis {
  pricePerformanceRatio: { [productId: string]: number };
  resaleValue: { [productId: string]: string };
  totalCostOfOwnership: { [productId: string]: number };
  hiddenCosts: { [productId: string]: string[] };
}

export interface UserRecommendations {
  powerUsers: {
    recommendedProduct: string;
    reasoning: string;
    alternatives: string[];
  };
  casualUsers: {
    recommendedProduct: string;
    reasoning: string;
    alternatives: string[];
  };
  cameraEnthusiasts: {
    recommendedProduct: string;
    reasoning: string;
    alternatives: string[];
  };
  gamers: {
    recommendedProduct: string;
    reasoning: string;
    alternatives: string[];
  };
  budgetConscious: {
    recommendedProduct: string;
    reasoning: string;
    alternatives: string[];
  };
  businessProfessionals: {
    recommendedProduct: string;
    reasoning: string;
    alternatives: string[];
  };
}

export interface ComparisonAnalysis {
  executiveSummary: string;
  overallRecommendation: {
    productId: string;
    reasoning: string;
    confidenceScore: number; // 0-100
  };

  // Enhanced category winners with detailed analysis
  categoryWinners: {
    bestDisplay: {
      productId: string;
      reasoning: string;
      technicalDetails: string;
      score: number;
    };
    bestCamera: {
      productId: string;
      reasoning: string;
      technicalDetails: string;
      score: number;
    };
    bestPerformance: {
      productId: string;
      reasoning: string;
      benchmarkData: string;
      score: number;
    };
    bestBattery: {
      productId: string;
      reasoning: string;
      realWorldTesting: string;
      score: number;
    };
    bestValue: {
      productId: string;
      reasoning: string;
      costBreakdown: string;
      score: number;
    };
    bestBuild: {
      productId: string;
      reasoning: string;
      materialsComparison: string;
      score: number;
    };
  };

  // Detailed specification comparisons
  specificationComparisons: {
    display: SpecComparison;
    processor: SpecComparison;
    camera: SpecComparison;
    battery: SpecComparison;
    build: SpecComparison;
    connectivity: SpecComparison;
    software: SpecComparison;
    audio: SpecComparison;
  };

  // Real-world performance analysis
  performanceAnalysis: {
    gaming: PerformanceAnalysis;
    photography: PerformanceAnalysis;
    batteryLife: PerformanceAnalysis;
    displayQuality: PerformanceAnalysis;
    audioQuality: PerformanceAnalysis;
    chargingSpeed: PerformanceAnalysis;
  };

  // Value proposition breakdown
  valueAnalysis: ValueAnalysis;

  // User-specific recommendations
  userRecommendations: UserRecommendations;

  // Pros and cons with measurable data
  prosAndCons: {
    [productId: string]: {
      pros: Array<{
        feature: string;
        advantage: string;
        measurement?: string; // e.g., "25% faster"
      }>;
      cons: Array<{
        feature: string;
        disadvantage: string;
        measurement?: string; // e.g., "15% less battery"
      }>;
    };
  };

  // Final verdict with percentage scores
  finalVerdict: {
    overallWinner: string;
    percentageScore: number;
    scenarios: Array<{
      scenario: string;
      winner: string;
      reasoning: string;
    }>;
    longTermAnalysis: string;
  };

  // Legacy field for backward compatibility
  detailedComparison: {
    [key: string]: {
      winner: string;
      comparison: string;
    };
  };

  buyingGuide: string[];
}

export interface AffiliateLink {
  url: string;
  tag: string;
  expiresAt?: number;
}

export interface SearchRequest {
  query: string;
  preferences?: UserPreferences;
}

export interface SearchResponse {
  products: Product[];
  analysis: ComparisonAnalysis;
  searchParams: SearchParams;
  cacheKey?: string;
}

export interface GoogleShoppingProduct {
  offerId: string;
  title: string;
  description?: string;
  link: string;
  imageLink: string;
  additionalImageLinks?: string[];
  price?: {
    value: string;
    currency: string;
  };
  brand?: string;
  gtin?: string;
  condition?: string;
  availability?: string;
}

export interface AmazonProduct {
  ASIN: string;
  DetailPageURL: string;
  Images?: {
    Primary?: {
      Large?: {
        URL: string;
      };
    };
    Variants?: Array<{
      Large?: {
        URL: string;
      };
    }>;
  };
  ItemInfo?: {
    Title?: {
      DisplayValue: string;
    };
    ByLineInfo?: {
      Brand?: {
        DisplayValue: string;
      };
    };
    Features?: {
      DisplayValues?: string[];
    };
  };
  Offers?: {
    Listings?: Array<{
      Price?: {
        Amount: number;
        Currency: string;
        DisplayAmount: string;
      };
      SavingBasis?: {
        Amount: number;
        DisplayAmount: string;
      };
    }>;
  };
  CustomerReviews?: {
    StarRating?: {
      Value: number;
    };
    Count?: number;
  };
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}