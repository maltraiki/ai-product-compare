import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_SHOPPING_API_KEY || '';
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '76abaa4752feb43b0';

    console.log('Testing Google Custom Search API');
    console.log('API Key exists:', !!apiKey);
    console.log('API Key from env:', !!process.env.GOOGLE_SHOPPING_API_KEY);
    console.log('Search Engine ID:', searchEngineId);

    const customsearch = google.customsearch('v1');

    // Simple test search
    const response = await customsearch.cse.list({
      auth: apiKey,
      cx: searchEngineId,
      q: 'iPhone 16',
      num: 1
    });

    return NextResponse.json({
      success: true,
      hasResults: !!(response.data.items && response.data.items.length > 0),
      resultCount: response.data.items?.length || 0,
      firstResult: response.data.items?.[0]?.title || 'No results',
      searchInfo: response.data.searchInformation
    });
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      details: error.response?.data || null,
      stack: error.stack
    });
  }
}