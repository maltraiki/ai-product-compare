'use client';

import { ComparisonAnalysis, Product } from '@/types';
import {
  Trophy, TrendingDown, Star, Award, CheckCircle, Info, Lightbulb,
  Battery, Cpu, Camera, Smartphone, DollarSign, Shield, Zap,
  Gauge, ThumbsUp, ThumbsDown, AlertCircle, Sparkles, ChevronRight,
  Activity, Wifi, MemoryStick, HardDrive, Monitor, Volume2
} from 'lucide-react';
import { useState } from 'react';

interface AnalysisReportProps {
  analysis: ComparisonAnalysis;
  products: Product[];
}

export default function AnalysisReport({ analysis, products }: AnalysisReportProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('summary');

  const getProductById = (id: string) => {
    return products.find(p => p.id === id);
  };

  // Parse the executive summary for detailed content
  const renderExecutiveSummary = () => {
    const summary = analysis.executiveSummary || '';

    // Split by common patterns in our enhanced prompt
    const sections = summary.split(/(?=The iPhone|That new|Here's|The jump|Look,|PRO TIP:|INSIDER|MONEY-SAVING)/);

    return (
      <div className="space-y-4">
        {sections.map((section, index) => {
          if (!section.trim()) return null;

          // Highlight special sections
          if (section.includes('PRO TIP:')) {
            return (
              <div key={index} className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-purple-600 mt-0.5" />
                  <p className="text-sm font-medium text-gray-900">{section}</p>
                </div>
              </div>
            );
          }

          if (section.includes('INSIDER') || section.includes('SECRET')) {
            return (
              <div key={index} className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-orange-600 mt-0.5" />
                  <p className="text-sm font-medium text-gray-900">{section}</p>
                </div>
              </div>
            );
          }

          if (section.includes('MONEY-SAVING')) {
            return (
              <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                <div className="flex items-start gap-2">
                  <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
                  <p className="text-sm font-medium text-gray-900">{section}</p>
                </div>
              </div>
            );
          }

          // Regular text with emphasis on numbers and percentages
          const highlightedText = section
            .replace(/(\d+(?:\.\d+)?%)/g, '<span class="font-bold text-blue-600">$1</span>')
            .replace(/(\d+(?:\.\d+)?\s*(?:mAh|GB|hours?|minutes?|fps|MHz|GHz|MP|mm|g|nits|x))/g,
                    '<span class="font-bold text-purple-600">$1</span>')
            .replace(/(A\d+\s*(?:Pro|Bionic)?)/g, '<span class="font-semibold text-orange-600">$1</span>')
            .replace(/(iPhone \d+(?:\s+Pro(?:\s+Max)?)?)/g, '<span class="font-semibold text-gray-900">$1</span>');

          return (
            <p
              key={index}
              className="text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightedText }}
            />
          );
        })}
      </div>
    );
  };

  const renderDetailedComparison = () => {
    if (!analysis.specificationComparisons) return null;

    const specs = analysis.specificationComparisons;
    const categories = [
      { key: 'display', icon: Monitor, title: 'Display Technology', color: 'blue' },
      { key: 'processor', icon: Cpu, title: 'Processing Power', color: 'purple' },
      { key: 'camera', icon: Camera, title: 'Camera System', color: 'green' },
      { key: 'battery', icon: Battery, title: 'Battery & Charging', color: 'orange' },
      { key: 'connectivity', icon: Wifi, title: 'Connectivity', color: 'cyan' },
      { key: 'audio', icon: Volume2, title: 'Audio Quality', color: 'pink' }
    ];

    return (
      <div className="grid gap-4">
        {categories.map(cat => {
          const spec = specs[cat.key as keyof typeof specs];
          if (!spec) return null;

          const Icon = cat.icon;

          return (
            <div key={cat.key} className={`bg-gradient-to-r from-${cat.color}-50 to-white rounded-xl p-5 border border-${cat.color}-200`}>
              <div className="flex items-center gap-3 mb-3">
                <Icon className={`w-6 h-6 text-${cat.color}-600`} />
                <h4 className="font-bold text-gray-900">{cat.title}</h4>
                {spec.winner && (
                  <span className={`ml-auto px-3 py-1 bg-${cat.color}-600 text-white text-xs font-bold rounded-full`}>
                    Winner: {spec.winner}
                  </span>
                )}
              </div>

              <p className="text-gray-700 mb-3">{spec.comparison}</p>

              {spec.details && (
                <div className="bg-white/80 rounded-lg p-3">
                  <p className="text-sm text-gray-600">{spec.details}</p>
                </div>
              )}

              {spec.scores && Object.keys(spec.scores).length > 0 && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(spec.scores).map(([productId, score]) => {
                    const product = getProductById(productId);
                    return product ? (
                      <div key={productId} className="bg-white rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-600 truncate">{product.title}</p>
                        <p className="text-lg font-bold text-gray-900">{score}/100</p>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderPerformanceAnalysis = () => {
    if (!analysis.performanceAnalysis) return null;

    const categories = [
      { key: 'gaming', icon: Gauge, title: 'Gaming Performance' },
      { key: 'photography', icon: Camera, title: 'Photography' },
      { key: 'batteryLife', icon: Battery, title: 'Battery Life' },
      { key: 'displayQuality', icon: Monitor, title: 'Display Quality' }
    ];

    return (
      <div className="grid md:grid-cols-2 gap-4">
        {categories.map(cat => {
          const perf = analysis.performanceAnalysis[cat.key as keyof typeof analysis.performanceAnalysis];
          if (!perf) return null;

          const Icon = cat.icon;

          return (
            <div key={cat.key} className="bg-white rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">{cat.title}</h4>
              </div>

              {perf.winner && (
                <div className="mb-2">
                  <span className="text-sm text-gray-600">Winner:</span>
                  <p className="font-bold text-gray-900">{perf.winner}</p>
                </div>
              )}

              {perf.realWorldTesting && (
                <p className="text-sm text-gray-700 mt-2 p-3 bg-gray-50 rounded-lg">
                  {perf.realWorldTesting}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderProsAndCons = () => {
    if (!analysis.prosAndCons || Object.keys(analysis.prosAndCons).length === 0) return null;

    return (
      <div className="space-y-6">
        {Object.entries(analysis.prosAndCons).map(([productId, data]) => {
          const product = getProductById(productId);
          if (!product || !data) return null;

          return (
            <div key={productId} className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                {product.image && (
                  <img src={product.image} alt={product.title} className="w-12 h-12 object-contain" />
                )}
                <div>
                  <h4 className="font-bold text-gray-900">{product.title}</h4>
                  <p className="text-sm text-gray-600">${product.price}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Pros */}
                {data.pros && data.pros.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ThumbsUp className="w-4 h-4 text-green-600" />
                      <h5 className="font-semibold text-green-700">Advantages</h5>
                    </div>
                    <ul className="space-y-2">
                      {data.pros.map((pro: any, idx: number) => (
                        <li key={idx} className="text-sm bg-green-50 p-2 rounded-lg">
                          <span className="font-medium text-green-900">{pro.feature}:</span>
                          <span className="text-green-700"> {pro.advantage}</span>
                          {pro.measurement && (
                            <span className="font-bold text-green-600"> ({pro.measurement})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Cons */}
                {data.cons && data.cons.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ThumbsDown className="w-4 h-4 text-red-600" />
                      <h5 className="font-semibold text-red-700">Disadvantages</h5>
                    </div>
                    <ul className="space-y-2">
                      {data.cons.map((con: any, idx: number) => (
                        <li key={idx} className="text-sm bg-red-50 p-2 rounded-lg">
                          <span className="font-medium text-red-900">{con.feature}:</span>
                          <span className="text-red-700"> {con.disadvantage}</span>
                          {con.measurement && (
                            <span className="font-bold text-red-600"> ({con.measurement})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFinalVerdict = () => {
    if (!analysis.finalVerdict) return null;

    const verdict = analysis.finalVerdict;

    return (
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h3 className="text-2xl font-bold mb-4">Final Verdict</h3>

        {verdict.overallWinner && (
          <div className="mb-4">
            <p className="text-blue-100 text-sm uppercase tracking-wide mb-1">Overall Winner</p>
            <p className="text-3xl font-bold">{verdict.overallWinner}</p>
            {verdict.percentageScore && (
              <div className="mt-2">
                <div className="bg-white/20 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-1000 ease-out"
                    style={{ width: `${verdict.percentageScore}%` }}
                  />
                </div>
                <p className="text-sm mt-1">Score: {verdict.percentageScore}/100</p>
              </div>
            )}
          </div>
        )}

        {verdict.scenarios && verdict.scenarios.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-semibold text-blue-100 uppercase tracking-wide">Best For:</p>
            {verdict.scenarios.map((scenario: any, idx: number) => (
              <div key={idx} className="bg-white/10 rounded-lg p-3">
                <p className="font-semibold">{scenario.scenario}</p>
                <p className="text-sm text-blue-100">{scenario.winner}</p>
                <p className="text-xs text-blue-200 mt-1">{scenario.reasoning}</p>
              </div>
            ))}
          </div>
        )}

        {verdict.longTermAnalysis && (
          <div className="mt-4 p-3 bg-white/10 rounded-lg">
            <p className="text-sm font-semibold mb-1">Long-term Outlook</p>
            <p className="text-sm text-blue-100">{verdict.longTermAnalysis}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8" />
          <h2 className="text-2xl font-bold">AI Expert Analysis</h2>
        </div>
        <p className="text-blue-100">Comprehensive technical comparison by AI</p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b bg-gray-50 px-6 py-2 flex gap-4 overflow-x-auto">
        {[
          { id: 'summary', label: 'Executive Summary', icon: Info },
          { id: 'specs', label: 'Technical Specs', icon: Cpu },
          { id: 'performance', label: 'Performance', icon: Gauge },
          { id: 'proscons', label: 'Pros & Cons', icon: CheckCircle },
          { id: 'verdict', label: 'Final Verdict', icon: Trophy }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setExpandedSection(expandedSection === tab.id ? null : tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              expandedSection === tab.id
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {expandedSection === 'summary' && (
          <div className="animate-fadeIn">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Expert Analysis & Insights
            </h3>
            {renderExecutiveSummary()}
          </div>
        )}

        {expandedSection === 'specs' && (
          <div className="animate-fadeIn">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Technical Specification Comparison</h3>
            {renderDetailedComparison()}
          </div>
        )}

        {expandedSection === 'performance' && (
          <div className="animate-fadeIn">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Real-World Performance Testing</h3>
            {renderPerformanceAnalysis()}
          </div>
        )}

        {expandedSection === 'proscons' && (
          <div className="animate-fadeIn">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Detailed Pros & Cons Analysis</h3>
            {renderProsAndCons()}
          </div>
        )}

        {expandedSection === 'verdict' && (
          <div className="animate-fadeIn">
            {renderFinalVerdict()}
          </div>
        )}

        {/* Overall Recommendation */}
        {analysis.overallRecommendation && expandedSection === 'summary' && (
          <div className="mt-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <div className="flex items-start gap-3">
              <Trophy className="w-6 h-6 text-green-600 mt-1" />
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Our Top Pick</h4>
                <p className="text-gray-700">{analysis.overallRecommendation.reasoning}</p>
                {analysis.overallRecommendation.confidenceScore && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">Confidence:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                        <div
                          className="bg-green-600 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${analysis.overallRecommendation.confidenceScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-green-600">
                        {analysis.overallRecommendation.confidenceScore}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Buying Guide */}
        {analysis.buyingGuide && analysis.buyingGuide.length > 0 && expandedSection === 'verdict' && (
          <div className="mt-6">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Smart Buying Tips
            </h4>
            <div className="grid gap-2">
              {analysis.buyingGuide.map((tip, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                  <ChevronRight className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <p className="text-sm text-gray-700">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}