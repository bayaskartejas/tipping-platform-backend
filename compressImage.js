const fs = require('fs');
const sharp = require('sharp');

const inputPath = './input/input (2).jpg'; // Replace with your input image path
const outputPath = './output/output2.jpg'; // Replace with your desired output path

async function compressImage() {
    try {
        // Read the original image
        const originalImage = sharp(inputPath);
        
        // Get metadata to assess the image size
        const metadata = await originalImage.metadata();
        const originalSizeInKB = metadata.size / 1024; // Convert bytes to KB

        // Set initial quality and resize factor
        let quality = 100;
        let compressedBuffer;
        let sizeInKB = 0;
        
        // Define resize factor based on original size
        let resizeFactor = originalSizeInKB > 2000 ? 0.5 : 0.9; // Resize to 50% for large images, 90% for smaller oness
        
        // Resize dimensions
        const newWidth = Math.floor(metadata.width * resizeFactor);
        const newHeight = Math.floor(metadata.height * resizeFactor);

        // Binary search for optimal quality
        let low = 1; // Start from 1 to avoid invalid quality
        let high = 100;
        let bestQuality = 100;

        while (low <= high) {
            quality = Math.floor((low + high) / 2);
            compressedBuffer = await originalImage
                .resize(newWidth, newHeight) // Resize the image
                .jpeg({ quality }) // Compress with current quality
                .toBuffer();

            sizeInKB = compressedBuffer.length / 1024; // Size in KB

            if (sizeInKB < 512) {
                bestQuality = quality; // Found a valid quality
                high = quality - 1; // Try for a better (higher quality)
            } else {
                low = quality + 1; // Quality is too high, reduce it
            }
        }

        // Save the best compressed image found
        await fs.promises.writeFile(outputPath, compressedBuffer);
        console.log(`Image compressed and saved to ${outputPath} at quality ${bestQuality}`);
    } catch (error) {
        console.error('Error compressing image:', error);
    }
}

compressImage();
