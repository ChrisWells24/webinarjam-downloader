/**
 * Configuration for WebinarJam Downloader
 * 
 * Update these paths for your macOS setup before running.
 * The Chrome profile path lets you skip logging in to WebinarJam.
 */

export const config = {
  // === Chrome Profile (macOS) ===
  // Path to your existing Chrome profile so you don't have to log in
  // The script will try to find the right profile automatically.
  // Path to your existing Chrome profile so you don't have to log in
  // The username on this Mac is "cryptobal24"
  // "Default" is the main profile — change to "Profile 1" etc. if you use a different one
  chromeProfilePath: process.env.CHROME_PROFILE_PATH || 
    `${process.env.HOME}/Library/Application Support/Google/Chrome/Default`,
  
  // Chrome executable path (macOS)
  chromeExecutablePath: process.env.CHROME_EXECUTABLE || 
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',

  // === WebinarJam ===
  // The dashboard URL (NOT the marketing homepage)
  // app.webinarjam.com is where your webinars live
  webinarJamURL: 'https://app.webinarjam.com/',
  
  // The on-demand/replay URL if different from dashboard
  onDemandURL: 'https://ondemand.webinarjam.com/',
  
  // Which webinar to download (set to null to pick the first one)
  // You can find the webinar ID in the URL when you open it in browser
  targetWebinarId: null,
  
  // Which replay to download (set to null to pick the first replay)
  targetReplayId: null,

  // === Download Settings ===
  // Path to your external hard drive
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
