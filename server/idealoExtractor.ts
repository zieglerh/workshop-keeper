import OpenAI from "openai";
import puppeteer from "puppeteer";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable must be set");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AVAILABLE_CATEGORIES = [
  "Tools - Cutting",
  "Tools - Electrical", 
  "Tools - Fastening",
  "Tools - Hand",
  "Tools - Measuring",
  "Tools - Pneumatic",
  "Tools - Power",
  "Equipment - Cleaning",
  "Equipment - Heavy",
  "Equipment - Lifting",
  "Equipment - Safety",
  "Equipment - Storage",
  "Equipment - Workshop Machinery",
  "Material & Supply - Chemicals & Fluids",
  "Material & Supply - Consumables",
  "Material & Supply - Electrical Components",
  "Material & Supply - Raw Materials",
  "Material & Supply - Replacement Parts"
];

const CATEGORY_EXAMPLES: Record<string, string> = {
  "Tools - Cutting": "Knives, Blades, Scissors",
  "Tools - Electrical": "Multimeters, Wire Strippers",
  "Tools - Fastening": "Wrenches, Sockets, Torque Tools",
  "Tools - Hand": "Screwdrivers, Hammers, Pliers",
  "Tools - Measuring": "Calipers, Tape Measures, Levels",
  "Tools - Pneumatic": "Air Compressors, Air Guns",
  "Tools - Power": "Drills, Grinders, Saws",
  "Equipment - Cleaning": "Vacuum Cleaners, Air Blowers",
  "Equipment - Heavy": "Welding Machines, CNC Machines",
  "Equipment - Lifting": "Hoists, Jacks, Cranes",
  "Equipment - Safety": "Helmets, Gloves, Goggles",
  "Equipment - Storage": "Tool Cabinets, Shelving, Racks",
  "Equipment - Workshop Machinery": "Lathes, Milling Machines, Sanders",
  "Material & Supply - Chemicals & Fluids": "Lubricants, Paints, Solvents",
  "Material & Supply - Consumables": "Screws, Nails, Sandpaper, Glue",
  "Material & Supply - Electrical Components": "Cables, Fuses, Connectors",
  "Material & Supply - Raw Materials": "Metal Sheets, Wood, Pipes",
  "Material & Supply - Replacement Parts": "Tool Bits, Spare Motors, Belts"
};

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

    // Launch browser and scrape content
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.goto(productUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Extract HTML content
    const htmlContent = await page.content();
    
    await browser.close();

    // Extract relevant data using OpenAI
    const prompt = `
Extrahiere die Produktinformationen von diesem Idealo.de HTML-Content und gib sie als JSON zurück.

Verfügbare Kategorien:
${AVAILABLE_CATEGORIES.map(cat => `• ${cat} - ${CATEGORY_EXAMPLES[cat]}`).join('\n')}

Extrahiere:
- name: Produktname
- category: Eine der verfügbaren Kategorien (exakt wie oben aufgelistet)
- description: Produktbeschreibung 
- image: URL des Hauptbildes (aus preload link im header)
- price: Günstigster Preis (nur Zahl mit €)
- quantity: Standardmenge (meist 1, außer bei Packungen)

HTML Content:
${htmlContent.substring(0, 15000)} // Limit to avoid token limits

Antworte nur mit gültigem JSON in diesem Format:
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
          content: "Du bist ein Experte für die Extraktion von Produktdaten von Idealo.de. Antworte nur mit gültigem JSON."
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
    if (!extractedData.name || !extractedData.category || !AVAILABLE_CATEGORIES.includes(extractedData.category)) {
      throw new Error('Failed to extract valid product data');
    }

    return {
      name: extractedData.name,
      category: extractedData.category,
      description: extractedData.description || '',
      image: extractedData.image || '',
      price: extractedData.price || '0',
      quantity: extractedData.quantity || 1
    };

  } catch (error: any) {
    console.error('Error extracting Idealo product:', error);
    throw new Error(`Failed to extract product: ${error?.message || 'Unknown error'}`);
  }
}