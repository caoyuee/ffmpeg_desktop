#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

function usage() {
  console.error(`Usage:
  node scripts/generate-updater-manifest.mjs \\
    --base-url <release asset base url> \\
    --artifact <platform=path/to/bundle> [--artifact <platform=path/to/bundle>] \\
    [--output dist/updater/latest.json] [--notes "release notes"]

Example:
  node scripts/generate-updater-manifest.mjs \\
    --base-url https://gitee.com/caoyuee/ffmpeg_desktop/releases/download/latest \\
    --artifact linux-x86_64=src-tauri/target/release/bundle/appimage/ffmpeg_desktop.AppImage \\
    --artifact windows-x86_64=src-tauri/target/release/bundle/nsis/ffmpeg_desktop.exe
`);
}

function parseArgs(argv) {
  const args = {
    artifacts: [],
    output: 'dist/updater/latest.json',
    notes: '',
    baseUrl: process.env.UPDATER_BASE_URL || '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--') {
      continue;
    } else if (arg === '--artifact' && next) {
      args.artifacts.push(next);
      i += 1;
    } else if (arg === '--output' && next) {
      args.output = next;
      i += 1;
    } else if (arg === '--base-url' && next) {
      args.baseUrl = next;
      i += 1;
    } else if (arg === '--notes' && next) {
      args.notes = next;
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else {
      console.error(`Unknown or incomplete argument: ${arg}`);
      usage();
      process.exit(1);
    }
  }

  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function parseArtifact(value) {
  const separatorIndex = value.indexOf('=');
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    throw new Error(`Invalid artifact "${value}". Expected <platform=path>.`);
  }
  return {
    platform: value.slice(0, separatorIndex),
    path: resolve(value.slice(separatorIndex + 1)),
  };
}

function readSignature(artifactPath) {
  const signaturePath = `${artifactPath}.sig`;
  return readFileSync(signaturePath, 'utf8').trim();
}

const args = parseArgs(process.argv.slice(2));
if (!args.baseUrl) {
  console.error('Missing --base-url or UPDATER_BASE_URL.');
  usage();
  process.exit(1);
}
if (args.artifacts.length === 0) {
  console.error('At least one --artifact is required.');
  usage();
  process.exit(1);
}

const packageJson = readJson('package.json');
const baseUrl = args.baseUrl.replace(/\/$/, '');
const platforms = {};

for (const item of args.artifacts) {
  const artifact = parseArtifact(item);
  if (platforms[artifact.platform]) {
    throw new Error(`Duplicate artifact platform "${artifact.platform}". Use one package per updater target.`);
  }
  platforms[artifact.platform] = {
    signature: readSignature(artifact.path),
    url: `${baseUrl}/${encodeURIComponent(basename(artifact.path))}`,
  };
}

const manifest = {
  version: packageJson.version,
  notes: args.notes,
  pub_date: new Date().toISOString(),
  platforms,
};

const outputPath = resolve(args.output);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote updater manifest: ${outputPath}`);
