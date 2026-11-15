/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const androidGenDir = path.join(rootDir, 'src-tauri', 'gen', 'android');
const appDir = path.join(androidGenDir, 'app');
const mainDir = path.join(appDir, 'src', 'main');
const resDir = path.join(mainDir, 'res');

if (!fs.existsSync(androidGenDir)) {
  console.error(`::error::Generated Android directory not found at ${androidGenDir}. Run 'npm run tauri android init -- --ci' first.`);
  process.exit(1);
}

// 1. Patch AndroidManifest.xml with required permissions, roundIcon, and extractNativeLibs
const manifestPath = path.join(mainDir, 'AndroidManifest.xml');
if (!fs.existsSync(manifestPath)) {
  console.error(`::error::AndroidManifest.xml not found at ${manifestPath}`);
  process.exit(1);
}

let manifest = fs.readFileSync(manifestPath, 'utf8');
const requiredPermissions = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.POST_NOTIFICATIONS',
];

for (const perm of requiredPermissions) {
  if (!manifest.includes(perm)) {
    manifest = manifest.replace(
      /(<manifest\b[^>]*>)/,
      `$1\n    <uses-permission android:name="${perm}" />`
    );
    console.log(`Added permission: ${perm}`);
  }
}

if (!manifest.includes('android:roundIcon=')) {
  manifest = manifest.replace(
    'android:icon="@mipmap/ic_launcher"',
    'android:icon="@mipmap/ic_launcher"\n        android:roundIcon="@mipmap/ic_launcher_round"'
  );
  console.log('Added android:roundIcon="@mipmap/ic_launcher_round"');
}

if (!manifest.includes('android:extractNativeLibs=')) {
  manifest = manifest.replace(
    /<application\b/,
    '<application\n        android:extractNativeLibs="true"'
  );
  console.log('Added android:extractNativeLibs="true"');
}

fs.writeFileSync(manifestPath, manifest, 'utf8');
console.log('Updated AndroidManifest.xml cleanly.');

// 2. Sync custom Android icons and remove template default drawable background grid
const customIconsDir = path.join(rootDir, 'src-tauri', 'icons', 'android');
if (!fs.existsSync(customIconsDir)) {
  console.error(`::error::Custom Android icons directory missing at ${customIconsDir}`);
  process.exit(1);
}

fs.cpSync(customIconsDir, resDir, { recursive: true, force: true });
const defaultGridBg = path.join(resDir, 'drawable', 'ic_launcher_background.xml');
if (fs.existsSync(defaultGridBg)) {
  fs.rmSync(defaultGridBg, { force: true });
  console.log('Removed default Tauri template green grid drawable/ic_launcher_background.xml');
}
console.log('Synced custom Android adaptive icons and mipmaps into res/.');

// 3. Install custom MainActivity.kt with startup diagnostics & uncaught exception capture
function findFiles(dir, fileName) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, fileName));
    } else if (entry.name === fileName) {
      results.push(full);
    }
  }
  return results;
}

const customMainActivity = path.join(rootDir, 'src-tauri', 'android', 'MainActivity.kt');
const targetActivities = findFiles(path.join(appDir, 'src'), 'MainActivity.kt');
if (targetActivities.length === 0) {
  console.error('::error::Could not locate generated MainActivity.kt under src-tauri/gen/android/app/src');
  process.exit(1);
}
for (const target of targetActivities) {
  fs.copyFileSync(customMainActivity, target);
  console.log(`Updated MainActivity.kt at ${path.relative(rootDir, target)}`);
}

// 4. Install comprehensive ProGuard rules
const customProguard = path.join(rootDir, 'src-tauri', 'android', 'proguard-rules.pro');
const targetProguard = path.join(appDir, 'proguard-rules.pro');
fs.copyFileSync(customProguard, targetProguard);
console.log('Installed comprehensive proguard-rules.pro.');

// 5. Disable R8 code shrinking/obfuscation across both AGP 8 (isMinifyEnabled) and AGP 9 (optimization { enable })
const gradleKtsPath = path.join(appDir, 'build.gradle.kts');
if (fs.existsSync(gradleKtsPath)) {
  let gradleKts = fs.readFileSync(gradleKtsPath, 'utf8');
  let patched = gradleKts
    .replace(/isMinifyEnabled\s*=\s*true/g, 'isMinifyEnabled = false')
    .replace(/enable\s*=\s*true/g, 'enable = false');
  if (patched === gradleKts) {
    console.warn('Warning: Neither isMinifyEnabled nor optimization.enable=true matched in build.gradle.kts');
  } else {
    fs.writeFileSync(gradleKtsPath, patched, 'utf8');
    console.log('Disabled release R8 shrinking/obfuscation in app/build.gradle.kts.');
  }
}

const gradleGroovyPath = path.join(appDir, 'build.gradle');
if (fs.existsSync(gradleGroovyPath)) {
  let gradleGroovy = fs.readFileSync(gradleGroovyPath, 'utf8');
  gradleGroovy = gradleGroovy.replace(/minifyEnabled\s+true/g, 'minifyEnabled false');
  fs.writeFileSync(gradleGroovyPath, gradleGroovy, 'utf8');
  console.log('Disabled release minifyEnabled in app/build.gradle.');
}
