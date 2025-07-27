import puppeteer from 'puppeteer';
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
  let browser;
  
  try {
    console.log('Launching browser for Idealo scraping...');
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const content = await page.content();
    const $ = cheerio.load(content);
    
    console.log('Parsing product details...');
    
    // Extract product title
    const title = $('h1').first().text().trim() || 
                  $('.productTitle').text().trim() || 
                  $('[data-testid="product-title"]').text().trim() ||
                  'Unbekanntes Produkt';
    
    // Extract price (try multiple selectors)
    const price = $('.price').first().text().trim() || 
                  $('[data-testid="price"]').text().trim() ||
                  $('.productPrice').text().trim();
    
    // Extract product image
    const imageUrl = $('img[data-testid="product-image"]').attr('src') || 
                     $('.productImage img').first().attr('src') ||
                     $('img').first().attr('src');
    
    // Extract product types
    const productTypes: string[] = [];
    $('[data-testid="product-types"] span, .productTypes span').each((i: number, el: any) => {
      const type = $(el).text().trim();
      if (type) productTypes.push(type);
    });
    
    // Extract specifications
    const specifications: { [key: string]: string } = {};
    
    // Try different specification table selectors
    $('.specifications tr, [data-testid="specifications"] tr, .productDetails tr').each((i: number, row: any) => {
      const $row = $(row);
      const key = $row.find('td:first-child, th:first-child').text().trim();
      const value = $row.find('td:last-child, td:nth-child(2)').text().trim();
      
      if (key && value && key !== value) {
        specifications[key] = value;
      }
    });
    
    // Alternative: Look for definition lists
    $('.specifications dl dt, [data-testid="specifications"] dl dt').each((i: number, dt: any) => {
      const $dt = $(dt);
      const key = $dt.text().trim();
      const value = $dt.next('dd').text().trim();
      
      if (key && value) {
        specifications[key] = value;
      }
    });
    
    // Look for labeled specifications
    $('[data-testid="specification-item"], .specification-item').each((i: number, item: any) => {
      const $item = $(item);
      const key = $item.find('.label, .key, [data-testid="spec-label"]').text().trim();
      const value = $item.find('.value, [data-testid="spec-value"]').text().trim();
      
      if (key && value) {
        specifications[key] = value;
      }
    });
    
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
    throw new Error(`Failed to extract product details: ${error?.message || 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
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