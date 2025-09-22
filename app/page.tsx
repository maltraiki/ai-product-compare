'use client';

import { useState } from 'react';
import SearchInterface from '@/components/SearchInterface';
import AnalysisReport from '@/components/AnalysisReport';
import { SearchResponse, APIResponse } from '@/types';
import { AlertCircle } from 'lucide-react';

export default function Home() {
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setSearchResponse(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data: APIResponse<SearchResponse> = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Search failed');
      }

      if (data.data) {
        setSearchResponse(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-7xl">
        <header className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 sm:mb-4">
            AI Product Comparison
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 px-2 sm:px-0">
            Find the perfect product with AI-powered analysis
          </p>
        </header>

        <SearchInterface onSearch={handleSearch} isLoading={isLoading} />

        {error && (
          <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Search Error</p>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {searchResponse && searchResponse.products.length > 0 && (
          <>
            {/* Only show AI Analysis - no grid or comparison tabs */}
            <div className="mt-8">
              {searchResponse.analysis && (
                <>
                  <AnalysisReport
                    analysis={searchResponse.analysis}
                    products={searchResponse.products}
                  />

                  {/* Retail links - mobile optimized */}
                  <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-white rounded-xl border border-gray-200 text-center">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Check Current Prices</h3>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                      <a
                        href={`https://www.noon.com/saudi-en/search?q=${encodeURIComponent(searchResponse.searchParams?.searchTerms || '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-medium sm:font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all text-sm sm:text-base"
                      >
                        View on Noon.com
                      </a>
                      <a
                        href={`https://www.amazon.sa/s?k=${encodeURIComponent(searchResponse.searchParams?.searchTerms || '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium sm:font-semibold hover:from-blue-700 hover:to-purple-700 transition-all text-sm sm:text-base"
                      >
                        View on Amazon.sa
                      </a>
                      <a
                        href={`https://www.jarir.com/sa-en/catalogsearch/result/?q=${encodeURIComponent(searchResponse.searchParams?.searchTerms || '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-medium sm:font-semibold hover:from-red-600 hover:to-pink-600 transition-all text-sm sm:text-base"
                      >
                        View on Jarir.com
                      </a>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-3 sm:mt-4 px-2 sm:px-0">
                      * Prices and availability may vary. Click links above to see current offerings.
                    </p>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {searchResponse && searchResponse.products.length === 0 && (
          <div className="mt-12 text-center p-8 bg-gray-50 rounded-2xl">
            <p className="text-gray-600">No products found for your search.</p>
            <p className="text-gray-500 mt-2">Try adjusting your search terms.</p>
          </div>
        )}
      </div>

      <footer className="mt-12 sm:mt-20 py-6 sm:py-8 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm sm:text-base text-gray-600">
            AI Product Comparison Platform
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
            Powered by Claude AI, Google & Amazon
          </p>
          <p className="text-xs text-gray-400 mt-2 px-2 sm:px-0">
            Prices subject to change. Commission may be earned.
          </p>
        </div>
      </footer>
    </main>
  );
}
