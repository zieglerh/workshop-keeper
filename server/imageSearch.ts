// src/lib/imageSearch.ts
import { getJson } from 'serpapi';

if (!process.env.SERPAPI_API_KEY) {
    throw new Error("SERPAPI_API_KEY environment variable must be set");
}

interface GoogleImageResult {
    success: boolean;
    error?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    sourceUrl?: string;
}

export async function searchProductImage(query: string): Promise<GoogleImageResult> {
    try {
        // Enhance search query for better product image results
        const searchQuery = `${query} product photo`;

        const response = await getJson({
            engine: "google_images",
            q: searchQuery,
            google_domain: "google.de",
            gl: "de",
            hl: "de",
            safe: "active",
            api_key: process.env.SERPAPI_API_KEY
        });

        const images = response["images_results"];
        
        if (!images || images.length === 0) {
            return {
                success: false,
                error: "No images found"
            };
        }

        // Find the first image that meets our criteria
        for (const image of images) {
            // Skip if image is too small
            if (image.original_width < 200 || image.original_height < 200) {
                continue;
            }

            // Skip images from blocked domains (add more as needed)
            const blockedDomains = ['bing.com', 'pinterest.com', 'facebook.com'];
            if (blockedDomains.some(domain => image.source?.includes(domain))) {
                continue;
            }

            return {
                success: true,
                imageUrl: image.original,
                thumbnailUrl: image.thumbnail,
                sourceUrl: image.source
            };
        }

        return {
            success: false,
            error: "No suitable images found"
        };

    } catch (error: any) {
        console.error('Error searching for product image:', error);
        return {
            success: false,
            error: error.message || "Failed to search for product image"
        };
    }
}