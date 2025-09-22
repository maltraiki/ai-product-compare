'use client';

import { Product } from '@/types';
import { Star, ShoppingCart, ExternalLink, TrendingDown, Award, Check, X } from 'lucide-react';
// import Image from 'next/image';

interface ProductCardProps {
  product: Product;
  isWinner?: {
    type: 'value' | 'quality' | 'features' | 'overall';
    reason: string;
  };
}

export default function ProductCard({ product, isWinner }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: product.currency || 'USD',
    }).format(price);
  };

  const getSourceBadgeColor = () => {
    return product.source === 'amazon'
      ? 'bg-orange-100 text-orange-800 border-orange-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getWinnerBadge = () => {
    if (!isWinner) return null;

    const badges = {
      value: { icon: TrendingDown, color: 'bg-green-500', text: 'Best Value' },
      quality: { icon: Star, color: 'bg-purple-500', text: 'Best Quality' },
      features: { icon: Award, color: 'bg-blue-500', text: 'Best Features' },
      overall: { icon: Award, color: 'bg-gradient-to-r from-yellow-400 to-orange-500', text: 'Top Choice' },
    };

    const badge = badges[isWinner.type];
    const Icon = badge.icon;

    return (
      <div className={`absolute top-2 left-2 z-10 ${badge.color} text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </div>
    );
  };

  return (
    <div className="relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group">
      {getWinnerBadge()}

      {product.discount && product.discount > 10 && (
        <div className="absolute top-2 right-2 z-10 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold">
          -{product.discount}%
        </div>
      )}

      <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        {product.image ? (
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <ShoppingCart className="w-16 h-16" />
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
            {product.title}
          </h3>
          <span className={`text-xs px-2 py-1 rounded-full border ${getSourceBadgeColor()}`}>
            {product.source}
          </span>
        </div>

        {product.brand && (
          <p className="text-sm text-gray-600 mb-2">{product.brand}</p>
        )}

        <div className="flex items-center gap-2 mb-3">
          {product.rating > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {product.rating.toFixed(1)}
              </span>
            </div>
          )}
          {product.reviewCount > 0 && (
            <span className="text-sm text-gray-500">
              ({product.reviewCount.toLocaleString()} reviews)
            </span>
          )}
        </div>

        <div className="mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>

        {product.features && product.features.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-bold text-gray-800 uppercase mb-2">Key Features</p>
            <ul className="space-y-1">
              {product.features.slice(0, 3).map((feature, index) => (
                <li key={index} className="text-sm text-gray-800 flex items-start gap-1">
                  <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1 font-medium">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {((product.pros && product.pros.length > 0) || (product.cons && product.cons.length > 0)) && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {product.pros && product.pros.length > 0 && (
              <div>
                <p className="text-xs font-bold text-green-700 mb-1">Pros</p>
                <ul className="space-y-0.5">
                  {product.pros.slice(0, 2).map((pro, index) => (
                    <li key={index} className="text-xs text-gray-800 flex items-start gap-1">
                      <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1 font-medium">{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {product.cons && product.cons.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-700 mb-1">Cons</p>
                <ul className="space-y-0.5">
                  {product.cons.slice(0, 2).map((con, index) => (
                    <li key={index} className="text-xs text-gray-800 flex items-start gap-1">
                      <X className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1 font-medium">{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 group"
          >
            <ShoppingCart className="w-4 h-4 group-hover:scale-110 transition-transform" />
            View on {product.source}
          </a>
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4 text-gray-600" />
          </a>
        </div>

        {isWinner && isWinner.reason && (
          <div className="mt-3 p-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Why this won:</span> {isWinner.reason}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}