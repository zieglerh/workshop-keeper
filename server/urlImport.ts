import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

interface ExtractedItemData {
  name: string;
  description: string;
  price?: number;
  imageUrl?: string;
  isPurchasable: boolean;
  confidence: number;
}

export async function extractItemDataFromUrl(url: string): Promise<ExtractedItemData> {
  try {
    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract basic information
    let name = '';
    let description = '';
    let price: number | undefined;
    let imageUrl: string | undefined;
    let isPurchasable = false;

    // Try to extract title/name
    name = $('h1').first().text().trim() ||
           $('title').text().trim() ||
           $('.product-title, .item-title, .title').first().text().trim() ||
           $('[class*="title"], [class*="name"], [class*="product"]').first().text().trim();

    // Clean up title (remove common suffixes)
    name = name.replace(/\s*-\s*.*$/, '').replace(/\s*\|\s*.*$/, '').trim();

    // Try to extract description
    description = $('.description, .product-description, [class*="description"]').first().text().trim() ||
                  $('meta[name="description"]').attr('content') ||
                  $('meta[property="og:description"]').attr('content') ||
                  $('.summary, .overview, .details').first().text().trim() ||
                  $('p').first().text().trim() ||
                  '';

    // Clean and limit description
    description = description.replace(/\s+/g, ' ').substring(0, 500).trim();

    // Try to extract price
    const priceSelectors = [
      '.price, .cost, .amount',
      '[class*="price"], [class*="cost"], [class*="amount"]',
      '[data-price], [data-cost]'
    ];

    for (const selector of priceSelectors) {
      const priceElement = $(selector).first();
      if (priceElement.length) {
        const priceText = priceElement.text() || priceElement.attr('data-price') || priceElement.attr('content') || '';
        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
        if (priceMatch) {
          price = parseFloat(priceMatch[0].replace(',', ''));
          break;
        }
      }
    }

    // Try to extract image
    imageUrl = $('meta[property="og:image"]').attr('content') ||
               $('.product-image img, .main-image img, .featured-image img').first().attr('src') ||
               $('img[class*="product"], img[class*="item"], img[class*="main"]').first().attr('src') ||
               $('img').first().attr('src');

    // Make relative URLs absolute
    if (imageUrl && !imageUrl.startsWith('http')) {
      const baseUrl = new URL(url);
      imageUrl = new URL(imageUrl, baseUrl.origin).toString();
    }

    // Determine if item is purchasable based on content
    const pageContent = $('body').text().toLowerCase();
    const purchaseIndicators = [
      'buy', 'purchase', 'add to cart', 'shop', 'order', 'price', 'cost', 
      'kaufen', 'bestellen', 'preis', 'kosten', 'warenkorb',
      '€', '$', 'eur', 'euro', 'dollar'
    ];

    isPurchasable = purchaseIndicators.some(indicator => 
      pageContent.includes(indicator) || 
      name.toLowerCase().includes(indicator) ||
      description.toLowerCase().includes(indicator)
    ) || !!price;

    // Calculate confidence based on extracted data quality
    let confidence = 0;
    if (name.length > 3) confidence += 30;
    if (description.length > 20) confidence += 30;
    if (price !== undefined) confidence += 20;
    if (imageUrl) confidence += 20;

    return {
      name: name || 'Imported Item',
      description: description || 'Imported from URL',
      price,
      imageUrl,
      isPurchasable,
      confidence: Math.min(confidence, 100)
    };

  } catch (error) {
    console.error('Error extracting data from URL:', error);
    throw new Error('Failed to extract item data from URL');
  }
}

// Helper function to detect if URL is likely a product page
export function isLikelyProductUrl(url: string): boolean {
  const productIndicators = [
    '/product/', '/item/', '/shop/', '/store/', '/buy/',
    '/artikel/', '/produkt/', '/shop/',
    'amazon.', 'ebay.', 'etsy.', 'alibaba.'
  ];

  return productIndicators.some(indicator => 
    url.toLowerCase().includes(indicator)
  );
}