#!/usr/bin/env node

/**
 * Model Download Script for Local Development
 *
 * Downloads transformer models and ONNX files from HuggingFace Hub
 * to the local public/models directory for development testing.
 *
 * Usage:
 *   node scripts/download-models.js
 *   npm run download-models
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MODELS = [
    {
        name: 'nbk-ats-semantic-v1-en',
        hfRepo: '0xnbk/nbk-ats-semantic-v1-en',
        files: [
            'config.json',
            'tokenizer.json',
            'tokenizer_config.json',
            'special_tokens_map.json',
            // ONNX models (quantized only)
            'onnx/model_quantized.onnx',
            // Ensemble scoring models
            'onnx/neural_mapper.onnx',
            'onnx/poly_features.onnx',
            'onnx/score_mapper.onnx',
            // Weights
            'universal_score_weights.json'
        ]
    },
    {
        name: 'nbk-ats-domain-v1-en',
        hfRepo: '0xnbk/nbk-ats-domain-v1-en',
        files: [
            'config.json',
            'tokenizer.json',
            'tokenizer_config.json',
            'special_tokens_map.json',
            // ONNX model (quantized only)
            'onnx/model_quantized.onnx'
        ]
    }
];

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'models');
const HF_BASE_URL = 'https://huggingface.co';

/**
 * Format bytes to human readable size
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Download a file from URL to destination path with redirect handling and progress
 */
function downloadFile(url, destPath, redirectCount = 0) {
    const MAX_REDIRECTS = 5;

    return new Promise((resolve, reject) => {
        if (redirectCount >= MAX_REDIRECTS) {
            reject(new Error('Too many redirects'));
            return;
        }

        const dir = path.dirname(destPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Parse URL properly
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch (err) {
            reject(new Error(`Invalid URL: ${url}`));
            return;
        }

        // Determine protocol (http or https)
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const file = fs.createWriteStream(destPath);
        let downloadedBytes = 0;
        let totalBytes = 0;

        protocol.get(parsedUrl, (response) => {
            // Handle all redirect status codes (301, 302, 307, 308)
            if ([301, 302, 307, 308].includes(response.statusCode)) {
                file.close();
                if (fs.existsSync(destPath)) {
                    fs.unlinkSync(destPath);
                }

                const redirectLocation = response.headers.location;
                if (!redirectLocation) {
                    reject(new Error('Redirect without location header'));
                    return;
                }

                // Handle relative and absolute redirect URLs
                let redirectUrl;
                try {
                    if (redirectLocation.startsWith('http://') || redirectLocation.startsWith('https://')) {
                        // Absolute URL
                        redirectUrl = redirectLocation;
                    } else {
                        // Relative URL - construct absolute URL
                        redirectUrl = new URL(redirectLocation, parsedUrl.origin).href;
                    }
                } catch (err) {
                    reject(new Error(`Invalid redirect URL: ${redirectLocation}`));
                    return;
                }

                // Follow redirect recursively
                downloadFile(redirectUrl, destPath, redirectCount + 1)
                    .then(resolve)
                    .catch(reject);

            } else if (response.statusCode === 200) {
                totalBytes = parseInt(response.headers['content-length'], 10);

                // Show progress
                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    if (totalBytes) {
                        const percent = Math.round((downloadedBytes / totalBytes) * 100);
                        const downloaded = formatBytes(downloadedBytes);
                        const total = formatBytes(totalBytes);
                        process.stdout.write(`\r     Progress: ${percent}% (${downloaded} / ${total})`);
                    }
                });

                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    if (totalBytes) {
                        process.stdout.write('\n'); // New line after progress
                    }
                    resolve();
                });
            } else {
                file.close();
                if (fs.existsSync(destPath)) {
                    fs.unlinkSync(destPath);
                }
                reject(new Error(`Failed to download: ${response.statusCode}`));
            }
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(destPath)) {
                fs.unlink(destPath, () => reject(err));
            } else {
                reject(err);
            }
        });

        file.on('error', (err) => {
            file.close();
            if (fs.existsSync(destPath)) {
                fs.unlink(destPath, () => reject(err));
            } else {
                reject(err);
            }
        });
    });
}

/**
 * Download all files for a model
 */
async function downloadModel(model) {
    console.log(`\n📦 Downloading ${model.name}...`);
    const modelDir = path.join(OUTPUT_DIR, model.name);

    for (const file of model.files) {
        const url = `${HF_BASE_URL}/${model.hfRepo}/resolve/main/${file}`;
        const destPath = path.join(modelDir, file);

        // Skip if file already exists
        if (fs.existsSync(destPath)) {
            console.log(`  ✓ ${file} (already exists)`);
            continue;
        }

        try {
            console.log(`  ⬇ Downloading ${file}...`);
            await downloadFile(url, destPath);
            console.log(`  ✅ ${file}`);
        } catch (error) {
            console.error(`  ❌ Failed to download ${file}: ${error.message}`);
            console.error(`     URL: ${url}`);
            // Continue with other files even if one fails
        }
    }

    console.log(`✅ ${model.name} download complete`);
}

/**
 * Main download function
 */
async function main() {
    const year = new Date().getFullYear();
    const line1 = '  LocalATS - Model Download Script';
    const line2 = `  Copyright © ${year} NBK (nbk.dev). All rights reserved.`;
    const width = 58;

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log(`║${line1.padEnd(width)}║`);
    console.log(`║${line2.padEnd(width)}║`);
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    console.log('🚀 Starting model download for local development...');
    console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    try {
        for (const model of MODELS) {
            await downloadModel(model);
        }

        console.log('\n✅ All models downloaded successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Set VITE_MODEL_SOURCE=local in your .env.development');
        console.log('   2. Run: npm run dev');
        console.log('   3. Models will be loaded from public/models directory\n');
    } catch (error) {
        console.error('\n❌ Download failed:', error.message);
        process.exit(1);
    }
}

// Run the download
main();
