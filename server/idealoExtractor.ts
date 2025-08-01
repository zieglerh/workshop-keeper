import OpenAI from "openai";
import { storage } from "./storage";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable must be set");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Categories are now loaded dynamically from the database

interface IdealoProduct {
  name: string;
  category: string;
  description: string;
  image: string;
  price: string;
  quantity: number;
}

export async function extractIdealoProduct(productUrl: string): Promise<IdealoProduct> {
  try {
    // Validate URL
    if (!productUrl.includes('idealo.de')) {
      throw new Error('URL must be from idealo.de');
    }

    // Get categories from database
    const categories = await storage.getAllCategories();
    const categoryList = categories.map(cat => `• ${cat.name} - ${cat.description || 'Various items'}`).join('\n');

    // Extract relevant data using OpenAI without web scraping
    const prompt = `
Analyze this Idealo.de product URL and extract product information based on the content and your knowledge of typical Idealo products.

URL: ${productUrl}

Available categories from database:
${categoryList}

Task:
Based on the URL content and product name, extract realistic product information for a workshop inventory system.

Extract/Create:
- name: Product name
- category: One of the available categories (exactly as listed above, best match)
- description: Realistic product description (2-3 sentences)
- image: Use URL from header
- price: Realistic price in Euro (e.g. "29.99")
- quantity: Standard quantity (usually 1, except for packages)

Example for "spax-screws":
- name: "SPAX Universal Screws 4x60mm"
- category: "Material & Supply - Consumables"
- description: "High-quality SPAX universal screws with T-STAR plus drive. Ideal for wood connections and versatile fastening work."
- image: "https://cdn.idealo.com/folder/Product/5295/5/5295589/s1_produktbild_gross/spax-4x60-t-star-t20-500-st-191010400603.jpg"

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
          content: "You are an expert for tools and industrial products. Analyze Idealo.de URLs and create realistic product data for a workshop inventory system. Respond only with valid JSON."
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

    // Validate extracted data
    const categoryNames = categories.map(cat => cat.name);
    if (!extractedData.name || !extractedData.category || !categoryNames.includes(extractedData.category)) {
      throw new Error('Failed to extract valid product data from URL');
    }

    return {
      name: extractedData.name,
      category: extractedData.category,
      description: extractedData.description || '',
      image: extractedData.image,
      price: extractedData.price || '0',
      quantity: extractedData.quantity || 1
    };

  } catch (error: any) {
    console.error('Error extracting Idealo product:', error);
    throw new Error(`Failed to extract product: ${error?.message || 'Unknown error'}`);
  }
}
