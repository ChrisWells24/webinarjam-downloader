/**
 * Main Entry Point — WebinarJam Downloader
 * 
 * Flow:
 * 1. Launch Chrome with existing profile (no login needed)
 * 2. Open WebinarJam
 * 3. Navigate to replays
 * 4. Select one webinar
 * 5. Select one replay, find the MP4
 * 6. Download MP4 to external hard drive
 * 
 * Usage:
 *   npm start          — Full run
 *   npm run dry-run    — Log what would happen without downloading
 *   npm run test       — Quick test (opens browser, checks login)
 */

import { config } from '../config/config.js';
import { logger } from './logger.js';
import { launchBrowser, closeBrowser } from './browser.js';
import { openWebinarJam, navigateToReplays, selectWebinar, selectReplay } from './webinarjam.js';
import { downloadFromUrl, downloadViaButton, verifyDownload } from './downloader.js';

async function main() {
  logger.separator();
  logger.info('WebinarJam Downloader — Starting');
  logger.info(`Mode: ${config.dryRun ? 'DRY RUN' : config.testMode ? 'TEST' : 'FULL RUN'}`);
  logger.info(`Download dir: ${config.downloadDir}`);
  logger.separator();

  let context, page, mp4Urls;

  try {
    // Step 1: Launch browser with existing Chrome profile
    const browser = await launchBrowser();
    context = browser.context;
    page = browser.page;
    mp4Urls = browser.mp4Urls;

    // Test mode — just verify browser launches and we can reach WebinarJam
    if (config.testMode) {
      logger.info('TEST MODE: Opening WebinarJam to verify login...');
      await page.goto(config.webinarJamURL, { waitUntil: 'networkidle', timeout: 30000 });
      logger.info(`Page title: ${await page.title()}`);
      logger.info(`Page URL: ${page.url()}`);
      await page.screenshot({ path: `${config.logDir}/test_mode_screenshot.png` });
      logger.success('Test complete — browser launches and WebinarJam is reachable');
      logger.info('If you see your dashboard in the screenshot, you are logged in ✓');
      await closeBrowser(context);
      return;
    }

    // Step 2: Open WebinarJam
    const isLoggedIn = await openWebinarJam(page);
    if (!isLoggedIn) {
      logger.warn('Not logged in — please log in to WebinarJam in Chrome first, then re-run');
      logger.info('The script uses your existing Chrome session, so just log in normally');
      await closeBrowser(context);
      return;
    }

    // Step 3: Navigate to replays
    await navigateToReplays(page);

    // Step 4: Select a webinar
    const webinar = await selectWebinar(page);

    // Step 5: Select a replay and find the video URL
    const replay = await selectReplay(page, mp4Urls);

    // Step 6: Download the MP4
    if (replay.videoUrl) {
      // Direct URL download — most reliable method
      const result = await downloadFromUrl(context, replay.videoUrl, webinar.name);
      if (!result.dryRun) {
        verifyDownload(result.filepath);
      }
    } else if (replay.hasDownloadButton) {
      // Fallback: click download button
      const result = await downloadViaButton(page, webinar.name);
      if (!result.dryRun) {
        verifyDownload(result.filepath);
      }
    } else {
      logger.error('No download method available — no MP4 URL found and no download button');
      logger.info('The page may require manual interaction. Check the screenshots in logs/ folder');
      logger.info('You can also try running the script with headless=false to see the browser');
    }

    // Done
    logger.separator();
    logger.success('WebinarJam Downloader — Complete');
    logger.info(`Log file: ${logger.getLogFile()}`);
    logger.separator();

  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    logger.debug('Stack trace:', error.stack);
    
    // Take error screenshot if we have a page
    if (page) {
      try {
        const errorScreenshot = `${config.logDir}/error_${Date.now()}.png`;
        await page.screenshot({ path: errorScreenshot, fullPage: true });
        logger.info(`Error screenshot saved: ${errorScreenshot}`);
      } catch (e) {
        // ignore screenshot errors
      }
    }
    
    process.exitCode = 1;
  } finally {
    // Always close browser
    if (context) {
      await closeBrowser(context);
    }
  }
}

// Run
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
