/**
 * Configuration for WebinarJam Downloader
 * 
 * Update these paths for your macOS setup before running.
 * The Chrome profile path lets you skip logging in to WebinarJam.
 */

export const config = {
  // === Chrome Profile (macOS) ===
  // Path to your existing Chrome profile so you don't have to log in
  // Your Chrome profile is named "Chris" (email: chris@socialsaleslab.com)
  // "Default" = the first/main Chrome profile
  chromeProfilePath: process.env.CHROME_PROFILE_PATH || 
    `${process.env.HOME}/Library/Application Support/Google/Chrome/Default`,
  
  // Chrome executable path (macOS)
  chromeExecutablePath: process.env.CHROME_EXECUTABLE || 
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',

  // === WebinarJam ===
  webinarJamURL: 'https://ondemand.webinarjam.com/',
  
  // Which webinar to download (set to null to pick the first one)
  targetWebinarId: null,
  
  // Which replay to download (set to null to pick the first replay)
  targetReplayId: null,

  // === Download Settings ===
  // Path to your external hard drive
  // "Chris Drive" as shown on desktop — note the space
  downloadDir: process.env.DOWNLOAD_DIR || '/Volumes/Chris Drive/webinarjam-replays',
  
  // File naming pattern: {date}_{webinarName}.mp4
  filenamePattern: '{date}_{webinarName}.mp4',
  
  // Timeout for downloads (ms) — 30 minutes for large files
  downloadTimeout: 30 * 60 * 1000,
  
  // Video quality preference (highest available by default)
  preferredQuality: 'highest',

  // === Behavior ===
  // If true, don't actually download — just log what would happen
  dryRun: process.argv.includes('--dry-run'),
  
  // If true, run a quick test that opens browser and checks login status
  testMode: process.argv.includes('--test'),
  
  // Headless mode (false = show browser window, true = run in background)
  headless: false,
  
  // Slow down actions for visibility (ms between steps)
  slowMo: 500,

  // === Logging ===
  logDir: `${import.meta.dirname}/../logs`,
  logLevel: 'debug', // error, warn, info, debug
};
