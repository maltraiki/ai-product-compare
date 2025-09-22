'use client';

import { useState } from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';

interface SearchInterfaceProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export default function SearchInterface({ onSearch, isLoading = false }: SearchInterfaceProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const exampleQueries = [
    'iPhone 16 vs Samsung S24',
    'Best gaming laptop under $1500',
    'Wireless headphones with ANC',
    'Coffee maker for home use',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    if (!isLoading) {
      onSearch(example);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-0">
      <form onSubmit={handleSubmit} className="relative">
        <div className={`relative transition-all duration-200 ${isFocused ? 'sm:scale-105' : ''}`}>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="What are you looking for? (e.g., 'iPhone 16 vs Samsung S24')"
            className={`w-full px-4 sm:px-6 py-3 sm:py-4 pr-24 sm:pr-32 text-base sm:text-lg text-black bg-white placeholder-gray-500 rounded-xl sm:rounded-2xl border-2 resize-none transition-all duration-200 ${
              isFocused
                ? 'border-blue-500 shadow-lg shadow-blue-100 bg-white'
                : 'border-gray-300 hover:border-gray-400 bg-white'
            } focus:outline-none focus:bg-white`}
            style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
            rows={2}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className={`absolute bottom-3 right-3 sm:bottom-4 sm:right-4 px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-medium transition-all duration-200 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base ${
              isLoading || !query.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 animate-spin" />
                <span className="hidden sm:inline">Searching...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                Search
              </>
            )}
          </button>
        </div>
      </form>

      {!query && !isLoading && (
        <div className="mt-6 sm:mt-8">
          <div className="flex items-center gap-2 mb-3 sm:mb-4 text-gray-600">
            <Sparkles className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span className="text-xs sm:text-sm font-medium">Try these examples:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {exampleQueries.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="text-left p-2.5 sm:p-3 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-purple-50 border border-gray-200 hover:border-blue-200 transition-all duration-200 group text-sm sm:text-base"
              >
                <span className="text-gray-700 group-hover:text-blue-700 transition-colors">
                  {example}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="mt-6 sm:mt-8 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping absolute"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            </div>
            <p className="text-blue-700 text-sm sm:text-base">
              <span className="hidden sm:inline">AI is analyzing your request and searching multiple sources...</span>
              <span className="sm:hidden">Searching products...</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}