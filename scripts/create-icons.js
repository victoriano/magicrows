const fs = require('fs');
const path = require('path');
const PNG2Icons = require('png2icons');

// Create the icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../build');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Read the PNG file
const pngBuffer = fs.readFileSync(path.join(__dirname, '../src/assets/rowvana_logo.png'));

// Convert to ICNS format (macOS)
const icnsBuffer = PNG2Icons.createICNS(pngBuffer, PNG2Icons.BILINEAR, 0);
if (icnsBuffer) {
  fs.writeFileSync(path.join(iconsDir, 'icon.icns'), icnsBuffer);
  console.log('Successfully created icon.icns');
} else {
  console.error('Failed to create ICNS file');
}

// Convert to ICO format (Windows)
const icoBuffer = PNG2Icons.createICO(pngBuffer, PNG2Icons.BILINEAR, 0, false);
if (icoBuffer) {
  fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuffer);
  console.log('Successfully created icon.ico');
} else {
  console.error('Failed to create ICO file');
}

// Copy the original PNG as well
fs.copyFileSync(
  path.join(__dirname, '../src/assets/rowvana_logo.png'), 
  path.join(iconsDir, 'icon.png')
);
console.log('Successfully copied icon.png');

console.log('All icons created successfully at', iconsDir);
