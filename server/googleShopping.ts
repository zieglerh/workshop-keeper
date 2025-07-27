import { getJson } from 'serpapi';

const SERPAPI_KEY = 'ba3f10987420a0760ae1552caf8b1a77c4ea5e8c68a64905e38cf620ae5e1d47';

export interface GoogleShoppingItem {
  title: string;
  price?: string;
  link: string;
  thumbnail?: string;
  source: string;
  delivery?: string;
  rating?: number;
  reviews?: number;
}

export async function searchGoogleShopping(query: string): Promise<GoogleShoppingItem[]> {
  try {
    const searchParams = {
      api_key: SERPAPI_KEY,
      engine: "google",
      q: query,
      location: "Germany",
      google_domain: "google.de",
      gl: "de",
      hl: "de",
      tbm: "shop",
      num: 10
    };

    console.log('SerpAPI Search Params:', searchParams);
    const response = await getJson(searchParams);
    console.log('SerpAPI Response:', JSON.stringify(response, null, 2));
    
    if (!response.shopping_results || !Array.isArray(response.shopping_results)) {
      console.log('No shopping results found or invalid format');
      return [];
    }

    const mappedResults = response.shopping_results.slice(0, 10).map((item: any) => ({
      title: item.title || 'Unbekannter Artikel',
      price: item.price || undefined,
      link: item.serpapi_product_api || item.link || item.product_link || '',
      thumbnail: item.thumbnail || undefined,
      source: item.source || 'Unbekannter Shop',
      delivery: item.delivery || undefined,
      rating: item.rating ? parseFloat(item.rating) : undefined,
      reviews: item.reviews ? parseInt(item.reviews.toString().replace(/[^\d]/g, '')) : undefined
    }));
    
    console.log('Mapped results:', mappedResults);
    return mappedResults;

  } catch (error) {
    console.error('Error searching Google Shopping:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`SerpAPI Error: ${error.message || 'Failed to search Google Shopping'}`);
  }
}