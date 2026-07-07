# WebinarJam Downloader

Playwright-based tool to download WebinarJam replay videos to your external hard drive using your existing Chrome profile (no re-login needed).

## Setup (macOS)

### 1. Install Node.js (if not already installed)

```bash
# Check if Node.js is installed
node --version

# If not installed, download from https://nodejs.org/ (LTS version)
# Or use Homebrew:
brew install node
```

### 2. Install Dependencies

```bash
cd webinarjam-downloader
npm install
npx playwright install chromium
```

### 3. Configure Paths

Edit `config/config.js` and update:

- **`chromeProfilePath`** — Path to your Chrome profile
  - Default: `~/Library/Application Support/Google/Chrome`
  - If you use a specific profile, change to `~/Library/Application Support/Google/Chrome/Default`
  
- **`downloadDir`** — Path to your external hard drive
  - Example: `/Volumes/MyExternal/webinarjam-replays`
  - Find your drive: `ls /Volumes/` in Terminal

- **`chromeExecutablePath`** — Chrome app path
  - Default: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`

### 4. Log In to WebinarJam

Open Chrome normally and log in to WebinarJam at least once. The script uses your existing Chrome session.

## Usage

```bash
# Full run — downloads one replay
npm start

# Dry run — logs what would happen without downloading
npm run dry-run

# Test mode — opens browser and checks if you're logged in
npm run test
```

## What It Does

1. Opens Chrome with your existing profile (you're already logged in)
2. Navigates to WebinarJam on-demand page
3. Goes to the replay section
4. Selects the first webinar
5. Finds the MP4 video URL (from page source or network traffic)
6. Downloads the MP4 to your external hard drive
7. Logs every action with timestamps and screenshots

## Project Structure

```
webinarjam-downloader/
├── config/
│   └── config.js          # All settings (Chrome path, download dir, etc.)
├── src/
│   ├── main.js            # Entry point — orchestrates the flow
│   ├── browser.js         # Launches Chrome with existing profile
│   ├── webinarjam.js      # Navigates WebinarJam (replays, webinars)
│   ├── downloader.js      # Downloads MP4 to external drive
│   └── logger.js          # Timestamped logging to console + file
├── logs/                  # All run logs and screenshots
├── package.json
└── README.md
```

## How MP4 Download Works

WebinarJam embeds the video URL in the page source when a replay plays. The script:

1. **Intercepts network traffic** — watches for `.mp4` and `cloudfront.net` URLs
2. **Scans page source** — searches for MP4 links in the HTML
3. **Downloads directly** — uses the browser's session/cookies to download the file
4. **Fallback** — if no direct URL is found, clicks the download button on the page

## Logs

Every run creates a log file in `logs/`:
- `run_YYYY-MM-DD.log` — timestamped action log
- `step2_webinarjam_loaded.png` — screenshot of WebinarJam dashboard
- `step3_replays_list.png` — screenshot of replay list
- `step4_webinar_selected.png` — screenshot of selected webinar
- `step5_replay_loaded.png` — screenshot of playing replay
- `error_*.png` — screenshot on error (if any)

## Troubleshooting

### "Chrome profile not found"
- Check the path: `ls ~/Library/Application\ Support/Google/Chrome/`
- You may need to use a specific profile folder (e.g., `Default`, `Profile 1`)

### "Not logged in"
- Open Chrome normally, go to WebinarJam, log in
- Make sure you're using the same Chrome profile the script uses

### "No webinars found"
- Check the screenshot in `logs/` to see what the page looks like
- You may need to adjust the selectors in `src/webinarjam.js`

### "No MP4 URL found"
- The replay may need to be played first — try running with `headless: false`
- Check if the webinar has a download button (paid feature)
- Try the dry-run mode to see what's happening

## Safety

- Only downloads ONE webinar replay per run (prototype)
- Does not automate all webinars (yet)
- Every action is logged
- Dry-run mode available for testing without downloading
