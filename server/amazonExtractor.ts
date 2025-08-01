import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import {storage} from "./storage";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable must be set");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AmazonProduct {
  name: string;
  category: string;
  description: string;
  image: string;
  price: string;
  quantity: number;
}

async function scrapeAmazonData(url: string) {
  const { data: html } = await axios.get(url, {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "de-DE,de;q=0.9,en;q=0.8,en-US;q=0.7",
      "cache-control": "no-cache",
      "device-memory": "8",
      "dnt": "1",
      "downlink": "10",
      "dpr": "2",
      "ect": "4g",
      "pragma": "no-cache",
      "priority": "u=0, i",
      "rtt": "50",
      "sec-ch-device-memory": "8",
      "sec-ch-dpr": "2",
      "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-ch-ua-platform-version": '"14.6.1"',
      "sec-ch-viewport-width": "2560",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      "viewport-width": "2560"
    }
  });

  const $ = cheerio.load(html);

  const name = $("#productTitle").text().trim();
  const image = $("#landingImage").attr("src") || "";
  let price =
      $("#priceblock_ourprice, #priceblock_dealprice")
          .first()
          .text()
          .replace(/[^\d.,]/g, "")
          .replace(",", ".");

  if (!price) {
    $(".a-price .a-offscreen").each(function () {
      const text = $(this).text().trim();
      if (text) {
        price = text.replace(/[^\d.,]/g, "").replace(",", ".");
        return false; // break .each() loop
      }
    });
  }
  price = price || "0";

  // Try to get product description
  let description = $("#productDescription").text().trim();

  // If not available, fall back to feature bullets
  if (!description) {
    description = $("#feature-bullets ul li span")
        .map((i, el) => $(el).text().trim())
        .get()
        .filter(Boolean)
        .slice(0, 3) // Optional: limit to 3 main features
        .join(" ");
  }
  console.log({ name, image, price, description });

  return { name, image, price, description };
}

export async function extractAmazonProduct(productUrl: string): Promise<AmazonProduct> {
  try {
    // Validate URL
    if (!productUrl.includes('amazon.')) {
      throw new Error('URL must be from amazon.');
    }

    const { name: scrapedName, image, price } = await scrapeAmazonData(productUrl);
    if (!scrapedName || !image) {
      throw new Error("Could not scrape essential product info.");
    }

    // Get categories from database
    const categories = await storage.getAllCategories();
    const categoryList = categories.map(cat => `• ${cat.name} - (${cat.description || 'Various items'})`).join('\n');

    // Extract relevant data using OpenAI without web scraping
    const prompt = `
You are a product data expert.

Use the following data extracted from a real Amazon product page to generate inventory information for a workshop system.

Scraped data:
- Name: ${scrapedName}
- Image: ${image}
- Price: ${price} €

Available categories from database:
${categoryList}

Task:
Based on the content, scrape product information for a workshop inventory system.

Extract/Create:
- name: Product name in english from #productTitle
- category: One of the available categories (exactly as listed above, best match based on product information, return only the part before any parentheses)
- description: Realistic product description (2-3 sentences)
- image: Main product image URL from #landingImage
- price: Realistic price in Euro (e.g. "29.99") from #priceblock_ourprice or #priceblock_dealprice
- quantity: Standard quantity (usually 1, except for packages)

Example for "Bosch Professional Cordless Drill GSR 12V-15":
- name: "Bosch Professional Cordless Drill GSR 12V-15"
- category: "Tools - Power"
- description: "The Bosch Professional GSR 12V-15 is a compact and powerful cordless drill, perfect for a wide range of drilling and screwdriving applications. It features a robust design and a long-lasting battery, making it ideal for professional use in workshops and construction sites."
- image: "https://m.media-amazon.com/images/I/71K7Q4FpguL._AC_SX679_.jpg"

Respond only with valid JSON in this format:
{
  "name": "string",
  "category": "string",
  "description": "string", 
  "image": "string",
  "price": "string",
  "quantity": number
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert for tools and industrial products. Classify workshop-related items and return structured JSON.",
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.1
    });

    const extractedData = JSON.parse(response.choices[0].message.content || '{}');
    console.log(extractedData);

    // // Validate extracted data
    // const categoryNames = categories.map(cat => cat.name);
    // if (!extractedData.name || !extractedData.category || !categoryNames.includes(extractedData.category)) {
    //   throw new Error('Failed to extract valid product data from URL');
    // }

    return {
      name: extractedData.name,
      category: extractedData.category || '',
      description: extractedData.description || '',
      image: extractedData.image,
      price: extractedData.price || '0',
      quantity: extractedData.quantity || 1
    };

  } catch (error: any) {
    console.error('Error extracting Amazon product:', error);
    throw new Error(`Failed to extract product: ${error?.message || 'Unknown error'}`);
  }
}
