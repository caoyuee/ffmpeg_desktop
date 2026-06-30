#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const bump = process.argv[2] ?? 'patch';
const validBumps = new Set(['patch', 'minor', 'major']);
const semverPattern = /^\d+\.\d+\.\d+$/;

function nextVersion(current, requested) {
  if (semverPattern.test(requested)) return requested;
  if (!validBumps.has(requested)) {
    throw new Error(`Invalid version bump "${requested}". Use patch, minor, major, or x.y.z.`);
  }

  const [major, minor, patch] = current.split('.').map(Number);
  if (requested === 'major') return `${major + 1}.0.0`;
  if (requested === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function compareVersions(left, right) {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const diff = leftParts[index] - rightParts[index];
    if (diff !== 0) return diff;
  }
  return 0;
}

function maxVersion(...versions) {
  return versions.reduce((highest, version) => (
    compareVersions(version, highest) > 0 ? version : highest
  ));
}

function replacePackageVersion(toml, version) {
  return toml.replace(/(^\[package\][\s\S]*?^version\s*=\s*")([^"]+)(")/m, `$1${version}$3`);
}

function readPackageVersion(toml) {
  const match = toml.match(/^\[package\][\s\S]*?^version\s*=\s*"([^"]+)"/m);
  if (!match) throw new Error('Could not find [package] version in Cargo.toml.');
  return match[1];
}

const packageJsonPath = new URL('../package.json', import.meta.url);
const cargoTomlPath = new URL('../src-tauri/Cargo.toml', import.meta.url);
const tauriConfigPath = new URL('../src-tauri/tauri.conf.json', import.meta.url);

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const cargoToml = await readFile(cargoTomlPath, 'utf8');
const tauriConfig = JSON.parse(await readFile(tauriConfigPath, 'utf8'));
const currentVersion = maxVersion(packageJson.version, readPackageVersion(cargoToml), tauriConfig.version);
const version = nextVersion(currentVersion, bump);

packageJson.version = version;
await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

await writeFile(cargoTomlPath, replacePackageVersion(cargoToml, version));

tauriConfig.version = version;
await writeFile(tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`);

console.log(version);
