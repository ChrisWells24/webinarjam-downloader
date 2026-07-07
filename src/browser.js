/**
 * Browser Module
 * 
 * Launches Chrome using the existing user profile via launchPersistentContext.
 * This means you're already logged into WebinarJam — no re-auth needed.
 */

import { chromium } from 'playwright';
import { config } from '../config/config.js';
import { logger } from './logger.js';

export async function launchBrowser() {
  logger.step(1, 6, 'Launching Chrome with existing profile');

  const fs = await import('fs');
  const path = await import('path');
  
  let profilePath = config.chromeProfilePath;
  logger.debug('Chrome profile path:', profilePath);
  logger.debug('Chrome executable:', config.chromeExecutablePath);

  // Check if Chrome is running (macOS)
  const { execSync } = await import('child_process');
  try {
    const chromeProcs = execSync('pgrep -f "Google Chrome"', { encoding: 'utf-8' }).trim();
    if (chromeProcs) {
      logger.warn('⚠ Google Chrome is already running!');
      logger.info('Playwright cannot use your profile while Chrome is open.');
      logger.info('Closing Chrome automatically...');
      try {
        execSync('pkill -f "Google Chrome"', { encoding: 'utf-8' });
        await new Promise(r => setTimeout(r, 2000));
        logger.debug('Chrome closed ✓');
      } catch (e) {
        logger.warn('Could not close Chrome automatically. Please close it manually and re-run.');
      }
    }
  } catch (e) {
    // pgrep returns non-zero if no process found — that's fine
    logger.debug('Chrome is not running ✓');
  }

  // Verify profile exists — try multiple common profile folder names
  const profilesToTry = [
    profilePath,
    `${process.env.HOME}/Library/Application Support/Google/Chrome/Default`,
    `${process.env.HOME}/Library/Application Support/Google/Chrome`,
  ];

  let foundProfile = null;
  for (const p of profilesToTry) {
    if (fs.existsSync(p)) {
      // Check if it looks like a Chrome profile (has a file like "Preferences" or "Cookies")
      const hasProfile = fs.existsSync(`${p}/Preferences`) || 
                         fs.existsSync(`${p}/Cookies`) ||
                         fs.existsSync(`${p}/Local State`);
      if (hasProfile) {
        foundProfile = p;
        break;
      }
    }
  }

  if (foundProfile) {
    profilePath = foundProfile;
    logger.debug(`Using Chrome profile: ${profilePath}`);
  } else {
    // List available Chrome profiles to help debug
    const chromeRoot = `${process.env.HOME}/Library/Application Support/Google/Chrome`;
    if (fs.existsSync(chromeRoot)) {
      const entries = fs.readdirSync(chromeRoot).filter(e => 
        e === 'Default' || e.startsWith('Profile') || e === 'System Profile'
      );
      logger.info('Available Chrome profiles:');
      entries.forEach(e => {
        const fullPath = `${chromeRoot}/${e}`;
        const hasPrefs = fs.existsSync(`${fullPath}/Preferences`);
        logger.info(`  ${e} ${hasPrefs ? '✓ (has data)' : '(empty)'}`);
      });
    }
    logger.error(`Chrome profile not found. Checked: ${profilePath}`);
    throw new Error('Chrome profile not found — see available profiles above');
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
      '--disable-blink-features=AutomationControlled', // Avoid detection
      '--no-first-run',
      '--no-default-browser-check',
    ],
    // Download path for any browser-triggered downloads
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
    if (url.includes('.mp4') || url.includes('cloudfront.net') || url.includes('progressive_redirect')) {
      logger.debug(`Found media URL: ${url.substring(0, 100)}...`);
      mp4Urls.push({ url, status: response.status(), headers: response.headers() });
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
  }
}
