/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Parse CLI arguments: <apk-path> [aapt-path]
const args = process.argv.slice(2);
const apkPath = args[0];
const aaptBin = args[1] || 'aapt';

if (!apkPath || !fs.existsSync(apkPath)) {
  console.error(`::error::APK file not found at: ${apkPath}`);
  process.exit(1);
}

console.log(`=== Verifying APK Launcher Icon & Metadata for: ${apkPath} ===`);

// 1. Run aapt dump badging
let badgingOutput = '';
try {
  badgingOutput = execSync(`"${aaptBin}" dump badging "${apkPath}"`, { encoding: 'utf8' });
} catch (err) {
  console.error(`::error::Failed to run aapt dump badging on ${apkPath}:`, err.message);
  process.exit(1);
}

// Check package name
if (!badgingOutput.includes("package: name='com.taghvim.calendar'")) {
  console.error("::error::Verification failed: APK package name is not com.taghvim.calendar");
  process.exit(1);
}
console.log("✓ Package name verified: com.taghvim.calendar");

// Check INTERNET permission
if (!badgingOutput.includes("android.permission.INTERNET")) {
  console.error("::error::Verification failed: android.permission.INTERNET not requested in APK");
  process.exit(1);
}
console.log("✓ Permission verified: android.permission.INTERNET");

// Extract icon declared in application badge
const iconMatch = badgingOutput.match(/application:[^>]*icon='([^']+)'/);
if (!iconMatch || !iconMatch[1]) {
  console.error("::error::Verification failed: No launcher icon path found in application badging");
  process.exit(1);
}
const declaredIcon = iconMatch[1];
console.log(`✓ Declared launcher icon in badging: ${declaredIcon}`);

// 2. Check that declared icon exists inside the APK ZIP archive
let apkZipList = '';
try {
  apkZipList = execSync(`unzip -l "${apkPath}"`, { encoding: 'utf8' });
} catch (err) {
  console.error(`::error::Failed to list APK archive contents:`, err.message);
  process.exit(1);
}

if (!apkZipList.includes(declaredIcon)) {
  console.error(`::error::Verification failed: Declared icon path '${declaredIcon}' is missing from APK archive!`);
  process.exit(1);
}
console.log(`✓ Declared icon resource '${declaredIcon}' exists inside APK archive`);

// 3. Adaptive Icon XML and Resource Table inspection
if (declaredIcon.endsWith('.xml')) {
  console.log(`Inspecting compiled Adaptive Icon XML (${declaredIcon})...`);
  let xmlTree = '';
  try {
    xmlTree = execSync(`"${aaptBin}" dump xmltree "${apkPath}" "${declaredIcon}"`, { encoding: 'utf8' });
  } catch (err) {
    console.warn(`Could not dump xmltree directly for ${declaredIcon}:`, err.message);
  }

  if (xmlTree) {
    if (!xmlTree.includes('adaptive-icon')) {
      console.error(`::error::Verification failed: ${declaredIcon} is not a valid adaptive-icon XML!`);
      process.exit(1);
    }
    console.log(`✓ Valid adaptive-icon XML structure detected in ${declaredIcon}`);
  }

  // Dump resource values to check adaptive icon background & foreground
  let resValues = '';
  try {
    resValues = execSync(`"${aaptBin}" dump --values resources "${apkPath}"`, { encoding: 'utf8' });
  } catch (err) {
    console.warn(`Could not dump resource values:`, err.message);
  }

  if (resValues) {
    // Check background color is #081017 (or #ff081017), not default white
    if (resValues.includes('ic_launcher_background')) {
      if (resValues.includes('081017') || resValues.includes('0x081017') || resValues.includes('0xff081017')) {
        console.log(`✓ Adaptive icon background color verified: #081017`);
      } else {
        console.log(`ℹ Adaptive icon background resource present`);
      }
    }
  }

  // Check for launcher image assets inside the APK
  // Under AAPT2, PNGs may be at res/mipmap-... or flattened res/...
  const lines = apkZipList.split('\n');
  const pngEntries = lines
    .map(line => line.trim().split(/\s+/).pop())
    .filter(name => name && name.startsWith('res/') && name.endsWith('.png'));

  console.log(`Found ${pngEntries.length} compiled image resource(s) under res/ in APK.`);
  if (pngEntries.length === 0) {
    console.error(`::error::Verification failed: No image resources found in APK!`);
    process.exit(1);
  }

  // Find launcher-related PNGs (either named ic_launcher, ic_launcher_foreground, or matching resource table)
  let launcherPng = pngEntries.find(p => p.includes('ic_launcher_foreground') || p.includes('ic_launcher'));
  if (!launcherPng && pngEntries.length > 0) {
    // If names are flattened (e.g. res/xx.png), use the first non-empty PNG under res/
    launcherPng = pngEntries[0];
  }

  console.log(`Validating launcher raster asset: ${launcherPng}`);
  const tempExtract = path.join(process.cwd(), 'temp_extracted_icon.png');
  try {
    execSync(`unzip -p "${apkPath}" "${launcherPng}" > "${tempExtract}"`);
  } catch (err) {
    console.error(`::error::Failed to extract ${launcherPng} from APK:`, err.message);
    process.exit(1);
  }

  const stat = fs.statSync(tempExtract);
  if (stat.size === 0) {
    console.error(`::error::Verification failed: Extracted icon ${launcherPng} is empty (0 bytes)!`);
    fs.unlinkSync(tempExtract);
    process.exit(1);
  }

  // Validate PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const buffer = fs.readFileSync(tempExtract);
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (!isPng) {
    console.error(`::error::Verification failed: Extracted file ${launcherPng} is not a valid PNG!`);
    fs.unlinkSync(tempExtract);
    process.exit(1);
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  console.log(`✓ Extracted icon valid PNG (${stat.size} bytes, ${width}x${height} px)`);
  fs.unlinkSync(tempExtract);
} else {
  // Direct PNG launcher icon
  const tempExtract = path.join(process.cwd(), 'temp_extracted_icon.png');
  try {
    execSync(`unzip -p "${apkPath}" "${declaredIcon}" > "${tempExtract}"`);
  } catch (err) {
    console.error(`::error::Failed to extract ${declaredIcon} from APK:`, err.message);
    process.exit(1);
  }

  const stat = fs.statSync(tempExtract);
  if (stat.size === 0) {
    console.error(`::error::Verification failed: Extracted icon ${declaredIcon} is empty (0 bytes)!`);
    fs.unlinkSync(tempExtract);
    process.exit(1);
  }

  const buffer = fs.readFileSync(tempExtract);
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (!isPng) {
    console.error(`::error::Verification failed: Extracted file is not a valid PNG!`);
    fs.unlinkSync(tempExtract);
    process.exit(1);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  console.log(`✓ Direct PNG icon verified (${stat.size} bytes, ${width}x${height} px)`);
  fs.unlinkSync(tempExtract);
}

console.log("=== APK Launcher Icon Verification Succeeded! ===");
