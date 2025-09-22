'use client';

import { Product } from '@/types';
import { Check, X, Star, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface ComparisonTableProps {
  products: Product[];
  maxProducts?: number;
}

export default function ComparisonTable({ products, maxProducts = 4 }: ComparisonTableProps) {
  const [selectedProducts, setSelectedProducts] = useState<Product[]>(
    products.slice(0, Math.min(2, products.length))
  );

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  const addProduct = () => {
    const availableProducts = products.filter(p =>
      !selectedProducts.find(sp => sp.id === p.id)
    );
    if (availableProducts.length > 0 && selectedProducts.length < maxProducts) {
      setSelectedProducts([...selectedProducts, availableProducts[0]]);
    }
  };

  const removeProduct = (index: number) => {
    if (selectedProducts.length > 1) {
      setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
    }
  };

  const changeProduct = (index: number, productId: string) => {
    const newProduct = products.find(p => p.id === productId);
    if (newProduct) {
      const newSelected = [...selectedProducts];
      newSelected[index] = newProduct;
      setSelectedProducts(newSelected);
    }
  };

  // Extract specs from features
  const extractSpec = (product: Product, keyword: string): string => {
    const feature = product.features?.find(f =>
      f.toLowerCase().includes(keyword.toLowerCase())
    );
    if (feature) return feature;

    // Extract from description
    const descWords = product.description?.toLowerCase();
    if (descWords?.includes(keyword.toLowerCase())) {
      return 'Yes';
    }
    return '-';
  };

  const specs = [
    { category: 'Display', specs: [
      { label: 'Screen Size', extract: (p: Product) => extractSpec(p, 'inch') },
      { label: 'Display Type', extract: (p: Product) => extractSpec(p, 'retina') || extractSpec(p, 'oled') || extractSpec(p, 'lcd') },
      { label: 'Refresh Rate', extract: (p: Product) => extractSpec(p, 'hz') || extractSpec(p, 'promotion') },
    ]},
    { category: 'Performance', specs: [
      { label: 'Processor', extract: (p: Product) => extractSpec(p, 'chip') || extractSpec(p, 'processor') },
      { label: 'RAM', extract: (p: Product) => extractSpec(p, 'ram') || extractSpec(p, 'gb') },
      { label: 'Storage', extract: (p: Product) => extractSpec(p, 'storage') || extractSpec(p, 'gb') || extractSpec(p, 'tb') },
    ]},
    { category: 'Camera', specs: [
      { label: 'Main Camera', extract: (p: Product) => extractSpec(p, 'mp') || extractSpec(p, 'camera') },
      { label: 'Video Recording', extract: (p: Product) => extractSpec(p, '4k') || extractSpec(p, 'video') },
      { label: 'Special Features', extract: (p: Product) => extractSpec(p, 'telephoto') || extractSpec(p, 'zoom') },
    ]},
    { category: 'Battery & Charging', specs: [
      { label: 'Battery Life', extract: (p: Product) => extractSpec(p, 'battery') || extractSpec(p, 'hours') },
      { label: 'Charging', extract: (p: Product) => extractSpec(p, 'charging') || extractSpec(p, 'usb') },
      { label: 'Wireless Charging', extract: (p: Product) => extractSpec(p, 'wireless') || extractSpec(p, 'magsafe') },
    ]},
    { category: 'Build & Design', specs: [
      { label: 'Materials', extract: (p: Product) => extractSpec(p, 'titanium') || extractSpec(p, 'aluminum') || extractSpec(p, 'glass') },
      { label: 'Water Resistance', extract: (p: Product) => extractSpec(p, 'water') || extractSpec(p, 'ip') },
      { label: 'Colors Available', extract: (p: Product) => extractSpec(p, 'color') || 'Multiple' },
    ]},
  ];

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <h2 className="text-2xl font-bold">Detailed Specifications Comparison</h2>
        <p className="text-blue-100 mt-1">Compare products side by side with all technical details</p>
      </div>

      {/* Product Selection Row */}
      <div className="bg-gray-50 p-4 border-b">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-gray-700">Comparing:</span>
          <div className="flex gap-2 flex-1">
            {selectedProducts.map((product, index) => (
              <div key={index} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
                <select
                  value={product.id}
                  onChange={(e) => changeProduct(index, e.target.value)}
                  className="font-medium text-sm focus:outline-none bg-transparent text-gray-800"
                  style={{ color: '#000' }}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title.length > 30 ? p.title.slice(0, 30) + '...' : p.title}
                    </option>
                  ))}
                </select>
                {selectedProducts.length > 1 && (
                  <button
                    onClick={() => removeProduct(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {selectedProducts.length < maxProducts && (
              <button
                onClick={addProduct}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="text-left p-4 font-bold text-gray-800 min-w-[200px]">
                Specification
              </th>
              {selectedProducts.map((product) => (
                <th key={product.id} className="p-4 min-w-[250px]">
                  <div className="space-y-2">
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-20 h-20 object-contain mx-auto"
                      />
                    )}
                    <div className="font-semibold text-gray-900 text-sm">
                      {product.title}
                    </div>
                    <div className="text-xl font-bold text-blue-600">
                      {formatPrice(product.price, product.currency)}
                    </div>
                    {product.rating > 0 && (
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{product.rating}</span>
                        <span className="text-xs text-gray-500">({product.reviewCount})</span>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {specs.map((category, catIndex) => (
              <>
                {/* Category Header */}
                <tr key={`cat-${catIndex}`} className="bg-gradient-to-r from-gray-800 to-gray-700">
                  <td colSpan={selectedProducts.length + 1} className="p-3">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                      {category.category}
                    </h3>
                  </td>
                </tr>
                {/* Specs in Category */}
                {category.specs.map((spec, specIndex) => (
                  <tr
                    key={`spec-${catIndex}-${specIndex}`}
                    className={specIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="p-3 font-medium text-gray-700 text-sm">
                      {spec.label}
                    </td>
                    {selectedProducts.map(product => {
                      const value = spec.extract(product);
                      const hasValue = value && value !== '-';

                      return (
                        <td key={product.id} className="p-3 text-center">
                          <span className={`text-sm ${hasValue ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                            {value}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}

            {/* Key Features Section */}
            <tr className="bg-gradient-to-r from-gray-800 to-gray-700">
              <td colSpan={selectedProducts.length + 1} className="p-3">
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                  Key Features
                </h3>
              </td>
            </tr>

            {/* Get all unique features */}
            {Array.from(new Set(selectedProducts.flatMap(p => p.features || [])))
              .slice(0, 10)
              .map((feature, index) => (
                <tr key={`feature-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 text-sm text-gray-700">
                    {feature}
                  </td>
                  {selectedProducts.map(product => (
                    <td key={product.id} className="p-3 text-center">
                      {product.features?.includes(feature) ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}

            {/* Action Row */}
            <tr className="bg-gradient-to-r from-blue-50 to-purple-50">
              <td className="p-4 font-bold text-gray-800">Get Best Price</td>
              {selectedProducts.map(product => (
                <td key={product.id} className="p-4 text-center">
                  <a
                    href={product.affiliateLink || product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                  >
                    View Deal
                  </a>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 text-center">
        <p className="text-sm text-gray-600">
          Specifications extracted from product listings. Actual specs may vary.
        </p>
      </div>
    </div>
  );
}