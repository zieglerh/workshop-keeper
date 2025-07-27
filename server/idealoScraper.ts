import * as cheerio from 'cheerio';

export interface IdealoProductDetails {
  title: string;
  price?: string;
  description?: string;
  specifications: {
    [key: string]: string;
  };
  imageUrl?: string;
  productTypes?: string[];
}

export async function extractIdealoProduct(url: string): Promise<IdealoProductDetails> {
  try {
    console.log('Fetching Idealo product page:', url);
    
    // Add timeout and retry logic
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // Fetch the page with proper headers and timeout
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      console.log('HTML content length:', html.length);
      
      // If we get very little content, the page might be blocked
      if (html.length < 1000) {
        throw new Error('Page content too small, possibly blocked');
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // If direct fetch fails, return a manual input fallback
      if (fetchError.name === 'AbortError' || fetchError.code === 'ETIMEDOUT') {
        console.log('Fetch timed out, returning manual input prompt');
        return {
          title: 'Manual Input Required',
          specifications: {
            'Note': 'Direct extraction failed due to network restrictions. Please enter product details manually.',
            'URL': url
          }
        };
      }
      throw fetchError;
    }
    
    const $ = cheerio.load(html);
    
    console.log('Parsing product details...');
    
    // Extract product title - Try multiple selectors for Idealo
    const title = $('h1[data-testid="product-title"]').text().trim() || 
                  $('h1').first().text().trim() || 
                  $('.product-title').text().trim() ||
                  $('[data-testid="productTitle"]').text().trim() ||
                  $('.sr-productTitle').text().trim() ||
                  'Unbekanntes Produkt';
    
    // Extract price - Multiple Idealo price selectors
    const price = $('[data-testid="price-offer-from"]').first().text().trim() ||
                  $('[data-testid="price"]').text().trim() ||
                  $('.price-text').first().text().trim() ||
                  $('.price').first().text().trim() ||
                  $('.sr-resultPrice').text().trim();
    
    // Extract product image - Idealo specific selectors
    const imageUrl = $('[data-testid="product-image"] img').attr('src') || 
                     $('img[data-testid="product-image"]').attr('src') || 
                     $('.product-image img').first().attr('src') ||
                     $('.sr-productImage img').attr('src') ||
                     $('img').first().attr('src');
    
    // Extract product types - Idealo specific selectors
    const productTypes: string[] = [];
    $('[data-testid="product-categories"] span, .product-categories span, .breadcrumbs a').each((i: number, el: any) => {
      const type = $(el).text().trim();
      if (type && type !== 'Home' && type.length > 2) productTypes.push(type);
    });
    
    // Extract specifications - Enhanced Idealo selectors
    const specifications: { [key: string]: string } = {};
    
    // Method 1: Try Idealo's product details table
    $('[data-testid="product-details"] tr, .product-details tr, .product-attributes tr').each((i: number, row: any) => {
      const $row = $(row);
      const key = $row.find('td:first-child, th:first-child, .attribute-name').text().trim();
      const value = $row.find('td:last-child, td:nth-child(2), .attribute-value').text().trim();
      
      if (key && value && key !== value) {
        specifications[key] = value;
      }
    });
    
    // Method 2: Look for definition lists in product specs
    $('[data-testid="product-specs"] dl dt, .product-specs dl dt, .specifications dl dt').each((i: number, dt: any) => {
      const $dt = $(dt);
      const key = $dt.text().trim();
      const value = $dt.next('dd').text().trim();
      
      if (key && value) {
        specifications[key] = value;
      }
    });
    
    // Method 3: Look for key-value pairs in specs section
    $('.spec-item, .specification-item, [data-testid="spec-item"]').each((i: number, item: any) => {
      const $item = $(item);
      const key = $item.find('.spec-label, .spec-key, .attribute-name').text().trim();
      const value = $item.find('.spec-value, .attribute-value').text().trim();
      
      if (key && value) {
        specifications[key] = value;
      }
    });
    
    // Method 4: Try to extract from general page content (fallback)
    if (Object.keys(specifications).length === 0) {
      // Look for common patterns in German product pages
      const pageText = $('body').text();
      const patterns = [
        /Schraubendurchmesser[:\s]+([^\n\s]+)/gi,
        /Schraubenlänge[:\s]+([^\n\s]+)/gi,
        /Material[:\s]+([^\n\s]+)/gi,
        /Gewinde[:\s]+([^\n\s]+)/gi,
        /Stückzahl[:\s]+([^\n\s]+)/gi,
      ];
      
      patterns.forEach(pattern => {
        const match = pageText.match(pattern);
        if (match) {
          const [full, value] = match[0].split(/[:\s]+/);
          if (full && value) {
            specifications[full.trim()] = value.trim();
          }
        }
      });
    }
    
    console.log('Extracted product details:', { title, price, specifications, productTypes });
    
    return {
      title,
      price: price || undefined,
      specifications,
      imageUrl: imageUrl || undefined,
      productTypes: productTypes.length > 0 ? productTypes : undefined
    };
    
  } catch (error: any) {
    console.error('Error scraping Idealo product:', error);
    
    // For network errors, return a helpful fallback response
    if (error.code === 'ETIMEDOUT' || error.name === 'AbortError' || error.message?.includes('fetch failed')) {
      return {
        title: 'Manual Input Required',
        specifications: {
          'Note': 'Network timeout occurred. Idealo may be blocking automated requests. Please copy product details manually from the website.',
          'URL': url,
          'Suggestion': 'Visit the Idealo page, copy the product name, price, and specifications, then paste them into the form manually.'
        }
      };
    }
    
    throw new Error(`Failed to extract product details: ${error?.message || 'Unknown error'}`);
  }
}

// Helper function to validate Idealo URL
export function isValidIdealoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('idealo.de');
  } catch {
    return false;
  }
}