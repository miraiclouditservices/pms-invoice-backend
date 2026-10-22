const logger = require('../../config/logger');

// In-memory sliding window cache for real-time deduplication and aggregation
// Key: `${cameraId}:${eventType}` -> { count: number, firstSeen: number, lastSeen: number, notificationId: string, timer: NodeJS.Timeout }
const eventWindows = new Map();

class CctvDeduplicationService {
  /**
   * Process an incoming normalized event for deduplication and aggregation
   * @param {object} normalizedEvent 
   * @param {number} [windowSeconds=30] 
   * @returns {{ shouldNotify: boolean, isAggregated: boolean, aggregatedCount: number, customTitle?: string, customMessage?: string }}
   */
  static processDeduplication(normalizedEvent, windowSeconds = 30) {
    const key = `${normalizedEvent.cameraId}:${normalizedEvent.eventType}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    let entry = eventWindows.get(key);

    if (!entry || (now - entry.firstSeen) > windowMs) {
      // First event in window: notify immediately
      entry = {
        count: 1,
        firstSeen: now,
        lastSeen: now,
        cameraName: normalizedEvent.metadata?.cameraName || 'Camera'
      };
      eventWindows.set(key, entry);

      return {
        shouldNotify: true,
        isAggregated: false,
        aggregatedCount: 1
      };
    }

    // Inside window: increment count
    entry.count += 1;
    entry.lastSeen = now;

    // If it's a high burst (e.g., 5, 10, 25, 50, 100 events), trigger an aggregated summary notification
    const isMilestone = entry.count === 5 || entry.count === 25 || entry.count === 50 || entry.count === 100;

    if (isMilestone) {
      const elapsedSeconds = Math.round((now - entry.firstSeen) / 1000) || 1;
      const customTitle = `Repeated ${normalizedEvent.eventType.replace('.', ' ')} at ${entry.cameraName}`;
      const customMessage = `Repeated ${normalizedEvent.eventType.replace('.', ' ')} detected at ${entry.cameraName} — ${entry.count} events in ${elapsedSeconds} seconds.`;

      logger.warn(`[CCTV Deduplication] Aggregated burst: ${customMessage}`);

      return {
        shouldNotify: true,
        isAggregated: true,
        aggregatedCount: entry.count,
        customTitle,
        customMessage
      };
    }

    // Otherwise throttle duplicate
    return {
      shouldNotify: false,
      isAggregated: true,
      aggregatedCount: entry.count
    };
  }

  /**
   * Clear in-memory deduplication window (useful for tests or device resets)
   */
  static clear() {
    eventWindows.clear();
  }
}

module.exports = CctvDeduplicationService;
