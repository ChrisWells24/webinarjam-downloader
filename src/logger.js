/**
 * Logger Module
 * 
 * Every action is logged to both console and file.
 * Logs are timestamped and categorized by level.
 */

import fs from 'fs';
import path from 'path';
import { config } from '../config/config.js';

// Ensure log directory exists
if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir, { recursive: true });
}

const logFile = path.join(config.logDir, `run_${new Date().toISOString().split('T')[0]}.log`);
const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = levels[config.logLevel] || levels.info;

function formatTimestamp() {
  return new Date().toISOString().replace('T', ' ').split('.')[0];
}

function log(level, message, data = null) {
  if (levels[level] > currentLevel) return;
  
  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  let line = `${prefix} ${message}`;
  if (data) {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    line += `\n  ${dataStr}`;
  }
  
  // Console output with colors
  const colors = {
    error: '\x1b[31m', // red
    warn: '\x1b[33m',  // yellow
    info: '\x1b[36m',  // cyan
    debug: '\x1b[90m', // gray
  };
  const reset = '\x1b[0m';
  console.log(`${colors[level] || ''}${line}${reset}`);
  
  // File output (no colors)
  fs.appendFileSync(logFile, line + '\n');
}

export const logger = {
  error: (msg, data) => log('error', msg, data),
  warn: (msg, data) => log('warn', msg, data),
  info: (msg, data) => log('info', msg, data),
  debug: (msg, data) => log('debug', msg, data),
  
  // Log a step action (always visible)
  step: (stepNum, totalSteps, description) => {
    log('info', `▶ Step ${stepNum}/${totalSteps}: ${description}`);
  },
  
  // Log success
  success: (msg, data) => log('info', `✓ ${msg}`, data),
  
  // Log a separator line
  separator: () => log('info', `${'─'.repeat(60)}`),
  
  getLogFile: () => logFile,
};
