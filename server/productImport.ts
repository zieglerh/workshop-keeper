import OpenAI from "openai";
import {storage} from "./storage";

if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable must be set");
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface ProductItem {
    name: string;
    category: string;
    description: string;
    image: string;
    price: string;
    quantity: number;
}

export async function getProductDetails(query: string): Promise<ProductItem> {
    // Get categories from database
    const categories = await storage.getAllCategories();
    const categoryList = categories.map(cat => `• ${cat.name} - (${cat.description || 'Various items'})`).join('\n');

    // Extract relevant data using OpenAI without web scraping
    const prompt = `
Extract product information to generate inventory information for a workshop system.

Product to search for: 
"${query}"

Available categories from database:
${categoryList}

Objective:
Search online for product details and extract standardized inventory data for a workshop system.

Return the following structured fields:
- name: Full product name in English
- category: Best matching category from the list above (only the part before any parentheses)
- description: Realistic product description (2–3 sentences)
- image: First best-matching product image (from any source), minimum 300x300 px, as direct image URL. Validate that the image exists (not a broken or missing URL). Ensure the image clearly shows the correct product (check visual match to product name, type, and description). Do not use placeholder graphics, logos, icons, or unrelated images. 
- price: Best current Euro price from Google product search, preferably from German shops or Amazon
- priceSource: Name of the shop and direct link to product page
- quantity: Default is 1 unless sold in packages

Example output for “Bosch Professional Cordless Drill GSR 12V-15”:
{
  "name": "Bosch Professional Cordless Drill GSR 12V-15",
  "category": "Tools - Power",
  "description": "The Bosch Professional GSR 12V-15 is a compact and powerful cordless drill, perfect for a wide range of drilling and screwdriving applications. It features a robust design and a long-lasting battery, making it ideal for professional use in workshops and construction sites.",
  "image": "https://tse3.mm.bing.net/th/id/OIP.Zz0SN_ZGT2O7yeruadwGogHaFh",
  "price": "29.99",
  "priceSource": "Amazon https://www.amazon.de/dp/B01MQNOPNK",
  "quantity": 1
}

Respond without explanation, without additional text, only with valid JSON in this format:
{
  "name": "string",
  "category": "string",
  "description": "string", 
  "image": "string",
  "price": "string",
  "quantity": number
}
`;

    console.log(prompt);

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
        response_format: {type: "json_object"},
        max_tokens: 1000,
        temperature: 0.1
    });

    let data = response.choices[0].message.content;
    console.log("response:", data);
    const extractedData = JSON.parse(data || '{}');
    console.log(extractedData);

    // // Validate extracted data
    // const categoryNames = categories.map(cat => cat.name);
    // if (!extractedData.name || !extractedData.category || !categoryNames.includes(extractedData.category)) {
    //   throw new Error('Failed to extract valid product data from URL');
    // }

    return {
        name: extractedData.name || '',
        category: extractedData.category || '',
        description: extractedData.description || '',
        image: extractedData.image,
        price: extractedData.price || '0',
        quantity: extractedData.quantity || 1
    };
}
