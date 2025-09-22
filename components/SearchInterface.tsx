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
    'Best wireless headphones under $300 with noise cancellation',
    'Compare gaming laptops for students with good battery life',
    'Top-rated coffee makers for home use under $200',
    'Professional cameras for wildlife photography',
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
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className={`relative transition-all duration-200 ${isFocused ? 'scale-105' : ''}`}>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Describe what you're looking for... (e.g., 'wireless headphones with great battery life under $200')"
            className={`w-full px-6 py-4 pr-32 text-lg text-black bg-white placeholder-gray-500 rounded-2xl border-2 resize-none transition-all duration-200 ${
              isFocused
                ? 'border-blue-500 shadow-lg shadow-blue-100 bg-white'
                : 'border-gray-300 hover:border-gray-400 bg-white'
            } focus:outline-none focus:bg-white`}
            style={{ color: '#000000', backgroundColor: '#FFFFFF' }}
            rows={3}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className={`absolute bottom-4 right-4 px-6 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
              isLoading || !query.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search
              </>
            )}
          </button>
        </div>
      </form>

      {!query && !isLoading && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4 text-gray-600">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Try these example searches:</span>
          </div>
          <div className="grid gap-3">
            {exampleQueries.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="text-left p-3 px-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-purple-50 border border-gray-200 hover:border-blue-200 transition-all duration-200 group"
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
        <div className="mt-8 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping absolute"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            </div>
            <p className="text-blue-700">
              AI is analyzing your request and searching multiple sources for the best products...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}