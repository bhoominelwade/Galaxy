import sharp from 'sharp';

// Helper function to generate and save texture
async function generateTexture(options, filename) {
  try {
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        ...options
      }
    })
    .noise('gaussian', options.noise || 30)
    .toFile(`./public/textures/${filename}`);
    console.log(`Generated ${filename}`);
  } catch (error) {
    console.error(`Error generating ${filename}:`, error);
  }
}

// Generate all textures
async function generateAllTextures() {
  try {
    await generateTexture(
      {
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        noise: 30
      },
      'tex1.jpg'
    );

    await generateTexture(
      {
        background: { r: 128, g: 128, b: 255, alpha: 1 },
        noise: 20
      },
      'tex2.jpg'
    );

    await generateTexture(
      {
        background: { r: 128, g: 128, b: 128, alpha: 1 },
        noise: 10
      },
      'tex3.jpg'
    );

    await generateTexture(
      {
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        noise: 5
      },
      'tex4.jpg'
    );

    console.log('All textures generated successfully!');
  } catch (error) {
    console.error('Error generating textures:', error);
  }
}

// Run the generation
generateAllTextures();