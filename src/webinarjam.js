/**
 * WebinarJam Module
 * 
 * Handles navigation through WebinarJam:
 * 1. Open WebinarJam on-demand page
 * 2. Navigate to webinar list
 * 3. Select a webinar
 * 4. Open replay view
 */

import { config } from '../config/config.js';
import { logger } from './logger.js';

/**
 * Navigate to WebinarJam and verify we're logged in
 */
export async function openWebinarJam(page) {
  logger.step(2, 6, 'Opening WebinarJam');
  
  logger.debug(`Navigating to: ${config.webinarJamURL}`);
  await page.goto(config.webinarJamURL, { waitUntil: 'networkidle', timeout: 30000 });
  logger.debug(`Page loaded: ${page.url()}`);
  logger.debug(`Page title: ${await page.title()}`);

  // Check if we're logged in or if there's a login wall
  const bodyText = await page.textContent('body').catch(() => '');
  
  // Look for common WebinarJam dashboard elements
  const hasDashboard = await page.locator('text=Replay').count() > 0 ||
                       await page.locator('text=Webinar').count() > 0 ||
                       await page.locator('text=On-Demand').count() > 0;

  if (hasDashboard) {
    logger.success('WebinarJam loaded — logged in via Chrome profile');
  } else {
    logger.warn('WebinarJam loaded but dashboard elements not found');
    logger.info('You may need to log in manually first in Chrome, then re-run');
    logger.debug('Body text preview:', bodyText?.substring(0, 500));
  }

  // Take screenshot for logging
  const screenshotPath = `${config.logDir}/step2_webinarjam_loaded.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });
  logger.debug(`Screenshot saved: ${screenshotPath}`);

  return hasDashboard;
}

/**
 * Navigate to the replay webinars section
 */
export async function navigateToReplays(page) {
  logger.step(3, 6, 'Navigating to replay webinars');
  
  // Try to find and click "Replay" or "Replay Webinars" link/tab
  const replaySelectors = [
    'text=Replay',
    'text=Replay Webinars',
    'text=Replays',
    'a:has-text("Replay")',
    'button:has-text("Replay")',
    '[data-testid*="replay"]',
    'nav a:has-text("Replay")',
  ];

  let clicked = false;
  for (const selector of replaySelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible().catch(() => false)) {
      logger.debug(`Clicking replay selector: ${selector}`);
      await element.click();
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    logger.warn('Could not find replay button — may already be on replays page');
    // Try navigating directly if we know the URL pattern
    if (page.url().includes('ondemand.webinarjam.com')) {
      logger.debug('Already on WebinarJam, looking for webinar list');
    }
  }

  // Wait for webinar list to load
  await page.waitForTimeout(2000);
  
  const screenshotPath = `${config.logDir}/step3_replays_list.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });
  logger.debug(`Screenshot saved: ${screenshotPath}`);
  
  logger.success('Replay section loaded');
}

/**
 * Select a webinar from the list
 * Returns webinar info { name, url, element }
 */
export async function selectWebinar(page) {
  logger.step(4, 6, 'Selecting webinar');
  
  // Find webinar links/items
  // WebinarJam typically shows webinars as cards or list items with links
  const webinarSelectors = [
    'a:has-text("Watch")',
    'a:has-text("watch")',
    '.webinar-card',
    '.webinar-item',
    '[class*="webinar"]',
    'a[href*="webinar"]',
    'a[href*="replay"]',
  ];

  let webinars = [];
  
  for (const selector of webinarSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    if (count > 0) {
      logger.debug(`Found ${count} webinars using selector: ${selector}`);
      
      for (let i = 0; i < count; i++) {
        const el = elements.nth(i);
        const text = await el.textContent().catch(() => '');
        const href = await el.getAttribute('href').catch(() => '');
        if (text && text.trim()) {
          webinars.push({ name: text.trim(), href, index: i, selector });
        }
      }
      if (webinars.length > 0) break;
    }
  }

  if (webinars.length === 0) {
    logger.error('No webinars found on page');
    logger.debug('Page URL:', page.url());
    const screenshotPath = `${config.logDir}/step4_no_webinars_found.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    throw new Error('No webinars found — check screenshot for page state');
  }

  // Log all found webinars
  logger.info(`Found ${webinars.length} webinar(s):`);
  webinars.forEach((w, i) => {
    logger.info(`  ${i + 1}. ${w.name}${w.href ? ` (${w.href.substring(0, 60)})` : ''}`);
  });

  // Select target or first webinar
  let selected;
  if (config.targetWebinarId) {
    selected = webinars.find(w => w.href?.includes(config.targetWebinarId));
    if (!selected) {
      logger.warn(`Webinar ID ${config.targetWebinarId} not found, using first`);
    }
  }
  
  if (!selected) {
    selected = webinars[0];
  }

  logger.info(`Selected: "${selected.name}"`);
  logger.debug(`Webinar href: ${selected.href || 'N/A'}`);

  // Click the webinar
  const element = page.locator(selected.selector).nth(selected.index);
  await element.click();
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const screenshotPath = `${config.logDir}/step4_webinar_selected.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });
  logger.debug(`Screenshot saved: ${screenshotPath}`);

  logger.success(`Webinar opened: ${selected.name}`);
  
  return selected;
}

/**
 * Select and play a replay within the webinar
 * Returns replay info { name, videoUrl }
 */
export async function selectReplay(page, mp4Urls) {
  logger.step(5, 6, 'Selecting replay and finding video');
  
  // Look for replay items
  const replaySelectors = [
    'text=Replay',
    'a:has-text("Replay")',
    'button:has-text("Replay")',
    '.replay-item',
    '[class*="replay"]',
    'video',
    'video source',
  ];

  // First try to find and click a replay item
  let replayClicked = false;
  for (const selector of replaySelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible().catch(() => false)) {
      logger.debug(`Clicking replay: ${selector}`);
      await element.click();
      await page.waitForTimeout(2000);
      replayClicked = true;
      break;
    }
  }

  if (!replayClicked) {
    logger.debug('No replay button found — video may auto-load');
  }

  // Look for video element and play it
  const video = page.locator('video').first();
  if (await video.count() > 0) {
    logger.debug('Found video element, attempting to play');
    
    // Try to play the video to trigger the MP4 URL
    try {
      await video.click().catch(() => {});
      await page.waitForTimeout(1000);
      
      // Press play button if exists
      const playButton = page.locator('button:has-text("Play"), [class*="play"], button[aria-label*="play"]').first();
      if (await playButton.isVisible().catch(() => false)) {
        await playButton.click();
        logger.debug('Clicked play button');
      }
    } catch (e) {
      logger.debug('Video play attempt:', e.message);
    }
  }

  // Wait for network to capture MP4 URL
  logger.debug('Waiting for video URL to appear in network traffic...');
  await page.waitForTimeout(5000);

  // Also try to find MP4 in page source
  const pageSource = await page.content();
  const mp4Matches = pageSource.match(/https?:\/\/[^"'\s\\]+\.mp4/gi);
  
  let videoUrl = null;

  if (mp4Matches && mp4Matches.length > 0) {
    videoUrl = mp4Matches[0].replace(/\\\//g, '/');
    logger.info(`Found MP4 URL in page source: ${videoUrl.substring(0, 100)}...`);
  } else if (mp4Urls.length > 0) {
    // Use captured network URL
    videoUrl = mp4Urls[mp4Urls.length - 1].url;
    logger.info(`Found MP4 URL from network: ${videoUrl.substring(0, 100)}...`);
  }

  // Also check for download button
  const downloadButton = page.locator(
    'a[download], button:has-text("Download"), a:has-text("Download"), [class*="download"], button[aria-label*="download"]'
  ).first();
  
  if (await downloadButton.isVisible().catch(() => false)) {
    logger.info('Download button found on page');
  } else {
    logger.debug('No download button found — will use direct URL download');
  }

  const screenshotPath = `${config.logDir}/step5_replay_loaded.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });
  logger.debug(`Screenshot saved: ${screenshotPath}`);

  if (!videoUrl) {
    logger.warn('No MP4 URL found yet — will try download button approach');
    // Return info about the download button for the downloader module
    return { name: 'replay', videoUrl: null, hasDownloadButton: await downloadButton.isVisible().catch(() => false) };
  }

  logger.success(`Replay video URL found`);
  
  return { name: 'replay', videoUrl, hasDownloadButton: false };
}
