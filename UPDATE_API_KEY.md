# UPDATE YOUR GOOGLE API KEY

The current API key is INVALID. Google returns "API_KEY_INVALID" error.

## Steps to fix:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "+ CREATE CREDENTIALS" → "API Key"
3. Copy the new API key
4. Enable Custom Search API: https://console.cloud.google.com/apis/library/customsearch.googleapis.com
5. Update the `.env.local` file:
   ```
   GOOGLE_SHOPPING_API_KEY=your_new_api_key_here
   ```
6. Update Vercel environment variables:
   - Go to Vercel Dashboard
   - Settings → Environment Variables
   - Update GOOGLE_SHOPPING_API_KEY

## Test your new key:
Once updated, test it by visiting: http://localhost:3000/api/test-google

Current Search Engine ID: 76abaa4752feb43b0 (this is correct)