import OpenAI from "openai";

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

    // Extract product ID from URL for image generation
    const productIdMatch = productUrl.match(/\/(\d+)_/);
    const productId = productIdMatch ? productIdMatch[1] : null;
    
    let imageUrl = "https://via.placeholder.com/300x300?text=Produkt";
    if (productId) {
      // Generate Idealo image URL based on product ID pattern
      imageUrl = `https://images.idealo.com/folder/Product/${productId.slice(0, 1)}/${productId.slice(1, 4)}/${productId}_s3.jpg`;
    }

    // Extract relevant data using OpenAI without web scraping
    const prompt = `
Analysiere diese Idealo.de Produkt-URL und extrahiere Produktinformationen basierend auf der URL-Struktur und deinem Wissen über typische Idealo-Produkte.

URL: ${productUrl}

Verfügbare Kategorien:
${AVAILABLE_CATEGORIES.map(cat => `• ${cat} - ${CATEGORY_EXAMPLES[cat]}`).join('\n')}

Aufgabe:
Basierend auf der URL und dem Produktnamen in der URL, erstelle realistische Produktinformationen für ein deutsches Werkstatt-Inventarsystem.

Extrahiere/Erstelle:
- name: Produktname (basierend auf URL-Segmenten)
- category: Eine der verfügbaren Kategorien (exakt wie oben aufgelistet, am besten passend)
- description: Realistische deutsche Produktbeschreibung (2-3 Sätze)
- image: Verwende diese spezifische URL: "${imageUrl}"
- price: Realistischer Preis in Euro (z.B. "29.99")
- quantity: Standardmenge (meist 1, außer bei Packungen)

Beispiel für "spax-schrauben":
- name: "SPAX Universalschrauben 4x60mm"
- category: "Material & Supply - Consumables"
- description: "Hochwertige SPAX Universalschrauben mit T-STAR plus Antrieb. Ideal für Holzverbindungen und vielseitige Befestigungsarbeiten."

Antworte nur mit gültigem JSON in diesem Format:
{
  "name": "string",
  "category": "string",
  "description": "string", 
  "image": "${imageUrl}",
  "price": "string",
  "quantity": number
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "Du bist ein Experte für deutsche Werkzeuge und Industrieprodukte. Analysiere Idealo.de URLs und erstelle realistische Produktdaten für ein Werkstatt-Inventarsystem. Antworte nur mit gültigem JSON."
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
      throw new Error('Failed to extract valid product data from URL');
    }

    return {
      name: extractedData.name,
      category: extractedData.category,
      description: extractedData.description || '',
      image: extractedData.image || imageUrl,
      price: extractedData.price || '0',
      quantity: extractedData.quantity || 1
    };

  } catch (error: any) {
    console.error('Error extracting Idealo product:', error);
    throw new Error(`Failed to extract product: ${error?.message || 'Unknown error'}`);
  }
}