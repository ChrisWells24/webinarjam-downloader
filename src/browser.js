/**
 * Browser Module
 * 
 * Launches Chrome using the existing user profile via launchPersistentContext.
 * This means you're already logged into WebinarJam — no re-auth needed.
 * 
 * IMPORTANT: Chrome must be fully closed before running — Playwright needs
 * exclusive access to the profile. The script will close Chrome for you
 * and reopen it when done.
 */

import { chromium } from 'playwright';
import { config } from '../config/config.js';
import { logger } from './logger.js';
import { execSync } from 'child_process';

export async function launchBrowser() {
  logger.step(1, 6, 'Launching Chrome with existing profile');

  const profilePath = config.chromeProfilePath;
  logger.debug('Chrome profile path:', profilePath);
  logger.debug('Chrome executable:', config.chromeExecutablePath);

  // Verify profile exists
  const fs = await import('fs');
  if (!fs.existsSync(profilePath)) {
    logger.error(`Chrome profile not found at: ${profilePath}`);
    logger.info('Update chromeProfilePath in config/config.js');
    throw new Error(`Chrome profile not found: ${profilePath}`);
  }

  logger.debug('Profile exists ✓');

  // Check if Chrome is already running (macOS)
  try {
    const chromeRunning = execSync('pgrep -x "Google Chrome" || true', { encoding: 'utf-8' }).trim();
    if (chromeRunning) {
      logger.warn('⚠ Google Chrome is already running!');
      logger.info('Playwright needs exclusive access to your Chrome profile.');
      logger.info('Closing Chrome automatically (will reopen after script finishes)...');
      
      // Gracefully quit Chrome on macOS
      execSync('osascript -e \'tell application "Google Chrome" to quit\'', { timeout: 10000 });
      
      // Wait for Chrome to fully close
      await new Promise(resolve => setTimeout(resolve, 3000));
      logger.debug('Chrome closed ✓');
    }
  } catch (e) {
    // Not on macOS or Chrome not running — continue
    logger.debug('Chrome running check skipped:', e.message);
  }

  // Launch persistent context — uses existing cookies, sessions, login state
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: config.headless,
    slowMo: config.slowMo,
    executablePath: config.chromeExecutablePath,
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    timezone: 'America/New_York',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
    ],
    acceptDownloads: true,
  });

  // Get or create a page
  let page;
  const pages = context.pages();
  if (pages.length > 0) {
    page = pages[0];
    logger.debug(`Using existing tab: ${page.url()}`);
  } else {
    page = await context.newPage();
    logger.debug('Created new tab');
  }

  // Set up network request interception to catch MP4 URLs
  const mp4Urls = [];
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('.mp4') || (url.includes('cloudfront.net') && url.includes('mp4')) || url.includes('progressive_redirect')) {
      // Only log actual video files, not page assets
      if (!url.includes('nitropack') && !url.includes('wp-content')) {
        logger.debug(`Found media URL: ${url.substring(0, 100)}...`);
        mp4Urls.push({ url, status: response.status(), headers: response.headers() });
      }
    }
  });

  // Catch download events
  page.on('download', (download) => {
    logger.info(`Download event detected: ${download.suggestedFilename()}`);
    logger.debug(`Download URL: ${download.url()}`);
  });

  logger.success('Browser launched with existing profile');
  logger.info(`Tabs open: ${pages.length}`);
  
  return { context, page, mp4Urls };
}

export async function closeBrowser(context) {
  logger.step(6, 6, 'Closing browser');
  
  if (context) {
    await context.close();
    logger.success('Browser closed');
    
    // Reopen Chrome for the user on macOS
    try {
      execSync('open -a "Google Chrome"', { timeout: 5000 });
      logger.info('Chrome reopened for you ✓');
    } catch (e) {
      logger.debug('Could not reopen Chrome automatically:', e.message);
    }
  }
}
