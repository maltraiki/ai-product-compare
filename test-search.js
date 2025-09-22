// Test Google Custom Search directly
const axios = require('axios');

const API_KEY = process.env.GOOGLE_SHOPPING_API_KEY || '';
const SEARCH_ENGINE_ID = '76abaa4752feb43b0';

async function testSearch() {
  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: API_KEY,
        cx: SEARCH_ENGINE_ID,
        q: 'iPhone 16 Pro price buy',
        num: 5
      }
    });

    console.log('Results found:', response.data.items?.length || 0);

    response.data.items?.forEach((item, index) => {
      console.log(`\n--- Result ${index + 1} ---`);
      console.log('Title:', item.title);
      console.log('Link:', item.link);
      console.log('Snippet:', item.snippet);

      // Check for price in different places
      if (item.pagemap?.offer) {
        console.log('Offer:', item.pagemap.offer);
      }
      if (item.pagemap?.product) {
        console.log('Product:', item.pagemap.product);
      }
      if (item.pagemap?.metatags?.[0]) {
        const meta = item.pagemap.metatags[0];
        if (meta['og:price:amount']) {
          console.log('Price from meta:', meta['og:price:amount']);
        }
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSearch();