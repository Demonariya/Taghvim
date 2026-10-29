/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const masterIcon = path.join(rootDir, 'src-tauri', 'icons', 'icon.png');
const outputIco = path.join(rootDir, 'src-tauri', 'icons', 'icon.ico');

if (!fs.existsSync(masterIcon)) {
  console.error(`Master icon not found at: ${masterIcon}`);
  process.exit(1);
}

// Check for ImageMagick command (magick on Windows/modern ImageMagick, convert on Linux/macOS)
let cmd = null;
try {
  execSync('magick -version', { stdio: 'ignore' });
  cmd = 'magick';
} catch {
  try {
    execSync('convert -version', { stdio: 'ignore' });
    cmd = 'convert';
  } catch {
    console.error('ImageMagick (magick or convert) is required to build the multi-resolution ICO file.');
    console.error('Please install ImageMagick: https://imagemagick.org/script/download.php');
    process.exit(1);
  }
}

console.log(`Using ${cmd} with Lanczos filter to build 9-size icon.ico (16, 20, 24, 32, 40, 48, 64, 128, 256 px)...`);

// Downscale using Lanczos filter without upscaling
const sizes = '256,128,64,48,40,32,24,20,16';
const fullCommand = `${cmd} "${masterIcon}" -filter Lanczos -define icon:auto-resize=${sizes} "${outputIco}"`;

execSync(fullCommand, { stdio: 'inherit' });

// Verify the generated ICO contains exactly 9 entries
const icoBuffer = fs.readFileSync(outputIco);
const count = icoBuffer.readUInt16LE(4);

if (count !== 9) {
  console.error(`Warning: Expected 9 icon entries, but generated ${count}.`);
  process.exit(1);
}

console.log(`Successfully generated ${outputIco} with 9 icon resolutions!`);
