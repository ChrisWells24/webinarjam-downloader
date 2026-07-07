/**
 * Downloader Module
 * 
 * Handles downloading the MP4 file:
 * 1. If we have a direct MP4 URL, download it with fetch
 * 2. If there's a download button, click it and save the file
 * 3. Save to the configured external hard drive path
 */

import fs from 'fs';
import path from 'path';
import { config } from '../config/config.js';
import { logger } from './logger.js';

/**
 * Ensure download directory exists
 */
function ensureDownloadDir() {
  if (!fs.existsSync(config.downloadDir)) {
    logger.debug(`Creating download directory: ${config.downloadDir}`);
    fs.mkdirSync(config.downloadDir, { recursive: true });
  }
  logger.debug(`Download directory ready: ${config.downloadDir}`);
}

/**
 * Generate a safe filename from webinar name and date
 */
function generateFilename(webinarName) {
  const date = new Date().toISOString().split('T')[0];
  const safeName = (webinarName || 'webinar')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 60)
    .toLowerCase();
  
  const filename = config.filenamePattern
    .replace('{date}', date)
    .replace('{webinarName}', safeName);
  
  return filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
}

/**
 * Download MP4 from a direct URL using the browser's cookies
 */
export async function downloadFromUrl(context, videoUrl, webinarName) {
  logger.info(`Downloading from URL: ${videoUrl.substring(0, 100)}...`);
  
  ensureDownloadDir();
  const filename = generateFilename(webinarName);
  const filepath = path.join(config.downloadDir, filename);
  
  if (config.dryRun) {
    logger.info(`[DRY RUN] Would download to: ${filepath}`);
    logger.info(`[DRY RUN] URL: ${videoUrl}`);
    return { success: true, filepath, dryRun: true };
  }

  // Use a page from the context to download (preserves cookies/auth)
  const page = await context.newPage();
  
  try {
    logger.debug(`Starting download to: ${filepath}`);
    
    // Navigate to the MP4 URL — the browser will handle the download
    // because it's a direct file, not a webpage
    const response = await page.goto(videoUrl, { waitUntil: 'commit', timeout: config.downloadTimeout });
    
    if (!response || !response.ok()) {
      throw new Error(`HTTP ${response?.status()} when downloading video`);
    }
    
    // Get the video as a buffer and save it
    const buffer = await response.body();
    fs.writeFileSync(filepath, buffer);
    
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    logger.success(`Downloaded: ${filename} (${sizeMB} MB)`);
    logger.info(`Saved to: ${filepath}`);
    
    return { success: true, filepath, size: buffer.length };
  } catch (error) {
    logger.error(`Download failed: ${error.message}`);
    throw error;
  } finally {
    await page.close();
  }
}

/**
 * Download by clicking the download button on the page
 */
export async function downloadViaButton(page, webinarName) {
  logger.info('Attempting download via download button');
  
  ensureDownloadDir();
  const filename = generateFilename(webinarName);
  const filepath = path.join(config.downloadDir, filename);
  
  if (config.dryRun) {
    logger.info(`[DRY RUN] Would click download button and save to: ${filepath}`);
    return { success: true, filepath, dryRun: true };
  }

  // Find and click the download button
  const downloadButton = page.locator(
    'a[download], button:has-text("Download"), a:has-text("Download"), [class*="download"], button[aria-label*="download"]'
  ).first();

  if (!(await downloadButton.isVisible().catch(() => false))) {
    throw new Error('Download button not found on page');
  }

  logger.debug('Clicking download button');
  
  // Set up download handler before clicking
  const downloadPromise = page.waitForEvent('download', { timeout: config.downloadTimeout });
  await downloadButton.click();
  
  const download = await downloadPromise;
  logger.debug(`Download started: ${download.suggestedFilename()}`);
  
  // Save the download to our target path
  await download.saveAs(filepath);
  
  // Get file size
  const stats = fs.statSync(filepath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  logger.success(`Downloaded: ${filename} (${sizeMB} MB)`);
  logger.info(`Saved to: ${filepath}`);
  
  return { success: true, filepath, size: stats.size };
}

/**
 * Verify the downloaded file is valid
 */
export function verifyDownload(filepath) {
  if (!fs.existsSync(filepath)) {
    logger.error(`File not found: ${filepath}`);
    return false;
  }
  
  const stats = fs.statSync(filepath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  if (stats.size < 1024) {
    logger.error(`File too small (${stats.size} bytes) — likely an error page, not a video`);
    return false;
  }
  
  logger.success(`Verified: ${filepath} (${sizeMB} MB)`);
  return true;
}
