/**
 * WebinarJam Module
 * 
 * Handles navigation through WebinarJam:
 * 1. Open WebinarJam dashboard (app.webinarjam.com — NOT the marketing homepage)
 * 2. Navigate to webinar list ("My Webinars")
 * 3. Select a webinar
 * 4. Open replay view and find the MP4 download
 */

import { config } from '../config/config.js';
import { logger } from './logger.js';

/**
 * Navigate to WebinarJam dashboard and verify we're logged in
 */
export async function openWebinarJam(page) {
  logger.step(2, 6, 'Opening WebinarJam dashboard');
  
  logger.debug(`Navigating to: ${config.webinarJamURL}`);
  await page.goto(config.webinarJamURL, { waitUntil: 'networkidle', timeout: 30000 });
  logger.debug(`Page loaded: ${page.url()}`);
  logger.debug(`Page title: ${await page.title()}`);

  // Check if we're on the dashboard or redirected to login
  const currentUrl = page.url();
  const isOnDashboard = currentUrl.includes('app.webinarjam.com') && !currentUrl.includes('login');
  
  // Look for dashboard-specific elements that only appear when logged in
  const hasMyWebinars = await page.locator('text=My Webinars').count() > 0 ||
                         await page.locator('text=My webinars').count() > 0 ||
                         await page.locator('a:has-text("Webinars")').count() > 0 ||
                         await page.locator('[class*="dashboard"]').count() > 0 ||
                         await page.locator('text=Replay').count() > 0;

  // Check if we hit a login page
  const hasLogin = await page.locator('input[type="password"]').count() > 0 ||
                    await page.locator('text=Sign in').count() > 0 ||
                    await page.locator('text=Log in').count() > 0;

  if (hasLogin && !hasMyWebinars) {
    logger.error('Not logged in — WebinarJam is showing the login page');
    logger.info('Please log in to WebinarJam in Chrome first, then re-run');
    logger.debug('Current URL:', currentUrl);
    
    const screenshotPath = `${config.logDir}/step2_not_logged_in.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    return false;
  }

  if (isOnDashboard || hasMyWebinars) {
    logger.success('WebinarJam dashboard loaded — logged in via Chrome profile ✓');
  } else {
    logger.warn('Unsure if logged in — check screenshot');
    logger.debug('Current URL:', currentUrl);
  }

  const screenshotPath = `${config.logDir}/step2_webinarjam_loaded.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });
  logger.debug(`Screenshot saved: ${screenshotPath}`);

  return true;
}

/**
 * Navigate to the replay/webinars section
 */
export async function navigateToReplays(page) {
  logger.step(3, 6, 'Navigating to My Webinars');
  
  // Try to find and click "My Webinars" or similar link/tab
  const navSelectors = [
    'a:has-text("My Webinars")',
    'a:has-text("My webinars")',
    'a:has-text("Webinars")',
    'text=My Webinars',
    'text=My webinars',
    'nav a:has-text("Webinar")',
    '[data-testid*="webinar"]',
    'a[href*="webinar"]',
    'a[href*="replay"]',
  ];

  let clicked = false;
  for (const selector of navSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible().catch(() => false)) {
      logger.debug(`Clicking: ${selector}`);
      await element.click();
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    logger.debug('No webinar nav button found — may already be on the right page');
  }

  // Wait for webinar list to load
  await page.waitForTimeout(3000);
  
  const screenshotPath = `${config.logDir}/step3_webinars_list.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });
  logger.debug(`Screenshot saved: ${screenshotPath}`);
  
  logger.success('Webinar list loaded');
}

/**
 * Select a webinar from the list
 * Returns webinar info { name, url, element }
 */
export async function selectWebinar(page) {
  logger.step(4, 6, 'Selecting webinar');
  
  // Find webinar links/items — WebinarJam shows webinars as cards or list items
  const webinarSelectors = [
    'a:has-text("Replay")',
    'a:has-text("replay")',
    'a:has-text("Watch")',
    '.webinar-card',
    '.webinar-item',
    '[class*="webinar"]',
    'a[href*="replay"]',
    'a[href*="webinar"]',
    'tr[class*="webinar"]',
    'div[class*="card"]',
  ];

  let webinars = [];
  
  for (const selector of webinarSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    if (count > 0) {
      logger.debug(`Found ${count} items using selector: ${selector}`);
      
      for (let i = 0; i < count; i++) {
        const el = elements.nth(i);
        const text = await el.textContent().catch(() => '');
        const href = await el.getAttribute('href').catch(() => '');
        if (text && text.trim().length > 2) {
          webinars.push({ name: text.trim().substring(0, 100), href, index: i, selector });
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
    throw new Error('No webinars found — check screenshot in logs/ folder');
  }

  // Log all found webinars
  logger.info(`Found ${webinars.length} webinar(s):`);
  webinars.forEach((w, i) => {
    logger.info(`  ${i + 1}. ${w.name}`);
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
 * Finds the MP4 URL from page source or network traffic
 * Returns replay info { name, videoUrl, hasDownloadButton }
 */
export async function selectReplay(page, mp4Urls) {
  logger.step(5, 6, 'Selecting replay and finding video');
  
  // Look for replay items or session selection
  // WebinarJam requires selecting a session before viewing/downloading replay
  const replaySelectors = [
    'text=Replay',
    'a:has-text("Replay")',
    'button:has-text("Replay")',
    'a:has-text("Download Replay")',
    'button:has-text("Download")',
    'a:has-text("Download")',
    '.replay-item',
    '[class*="replay"]',
    'video',
    'video source',
    // Session selection
    'a:has-text("Session")',
    'select option',
  ];

  // First try to find and click a replay/session item
  let replayClicked = false;
  for (const selector of replaySelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible().catch(() => false)) {
      logger.debug(`Clicking: ${selector}`);
      await element.click();
      await page.waitForTimeout(2000);
      replayClicked = true;
      break;
    }
  }

  if (!replayClicked) {
    logger.debug('No replay button found — video may auto-load or download button may be on page');
  }

  // Look for video element and play it to trigger MP4 URL
  const video = page.locator('video').first();
  if (await video.count() > 0) {
    logger.debug('Found video element, attempting to play');
    
    try {
      await video.click().catch(() => {});
      await page.waitForTimeout(1000);
      
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
    // Filter out marketing video URLs
    const replayUrls = mp4Matches.filter(u => 
      !u.includes('nitropack') && 
      !u.includes('wp-content') &&
      !u.includes('hero') &&
      !u.includes('homepage')
    );
    if (replayUrls.length > 0) {
      videoUrl = replayUrls[0].replace(/\\\//g, '/');
      logger.info(`Found MP4 URL in page source: ${videoUrl.substring(0, 100)}...`);
    }
  }
  
  if (!videoUrl && mp4Urls.length > 0) {
    videoUrl = mp4Urls[mp4Urls.length - 1].url;
    logger.info(`Found MP4 URL from network: ${videoUrl.substring(0, 100)}...`);
  }

  // Check for download button (WebinarJam paid feature)
  const downloadButton = page.locator(
    'a[download], button:has-text("Download"), a:has-text("Download"), a:has-text("Download Replay"), [class*="download"], button[aria-label*="download"]'
  ).first();
  
  const hasDownloadButton = await downloadButton.isVisible().catch(() => false);
  
  if (hasDownloadButton) {
    logger.info('Download button found on page ✓');
  } else {
    logger.debug('No download button found — will use direct URL if available');
  }

  const screenshotPath = `${config.logDir}/step5_replay_loaded.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false });
  logger.debug(`Screenshot saved: ${screenshotPath}`);

  if (!videoUrl && !hasDownloadButton) {
    logger.warn('No MP4 URL or download button found yet');
    logger.info('Check the screenshot in logs/ to see what the page looks like');
  }

  return { name: 'replay', videoUrl, hasDownloadButton };
}
