import { describe, it, expect } from 'vitest';
import { TimingService } from '../../../domain/services/TimingService';

describe('TimingService', () => {
  const timingService = new TimingService();

  describe('calculateAverage', () => {
    it('should calculate average of lap times', () => {
      const lapTimes = [60000, 61000, 62000]; // 60s, 61s, 62s
      expect(timingService.calculateAverage(lapTimes)).toBe(61000);
    });

    it('should return 0 for empty array', () => {
      expect(timingService.calculateAverage([])).toBe(0);
    });

    it('should handle single lap time', () => {
      expect(timingService.calculateAverage([45000])).toBe(45000);
    });

    it('should round to nearest millisecond', () => {
      const lapTimes = [60000, 61000, 62000, 63000]; // avg = 61500
      expect(timingService.calculateAverage(lapTimes)).toBe(61500);
    });
  });

  describe('calculateBest4Of5Average', () => {
    it('should return average of best 4 times from 5', () => {
      // Times: 60, 65, 61, 62, 63 (sorted: 60, 61, 62, 63, 65)
      // Best 4: 60, 61, 62, 63 = avg 61.5
      const lapTimes = [60000, 65000, 61000, 62000, 63000];
      expect(timingService.calculateBest4Of5Average(lapTimes)).toBe(61500);
    });

    it('should return regular average if less than 5 laps', () => {
      const lapTimes = [60000, 61000, 62000];
      expect(timingService.calculateBest4Of5Average(lapTimes)).toBe(61000);
    });

    it('should handle exactly 5 laps', () => {
      const lapTimes = [100000, 90000, 80000, 70000, 60000];
      // Best 4: 60, 70, 80, 90 = avg 75
      expect(timingService.calculateBest4Of5Average(lapTimes)).toBe(75000);
    });
  });

  describe('getBestLap', () => {
    it('should return the fastest lap time', () => {
      const lapTimes = [65000, 60000, 62000, 61000];
      expect(timingService.getBestLap(lapTimes)).toBe(60000);
    });

    it('should return null for empty array', () => {
      expect(timingService.getBestLap([])).toBeNull();
    });

    it('should handle single lap', () => {
      expect(timingService.getBestLap([45000])).toBe(45000);
    });
  });

  describe('formatTime', () => {
    it('should format time in M:SS.mmm format', () => {
      expect(timingService.formatTime(65123)).toBe('1:05.123');
    });

    it('should handle times under a minute', () => {
      expect(timingService.formatTime(45123)).toBe('0:45.123');
    });

    it('should handle exact seconds', () => {
      expect(timingService.formatTime(60000)).toBe('1:00.000');
    });

    it('should return placeholder for null', () => {
      expect(timingService.formatTime(null)).toBe('--:--.---');
    });

    it('should return placeholder for undefined', () => {
      expect(timingService.formatTime(undefined)).toBe('--:--.---');
    });

    it('should handle large times (over 2 minutes)', () => {
      expect(timingService.formatTime(125456)).toBe('2:05.456');
    });
  });

  describe('formatDelta', () => {
    it('should format positive delta with + prefix', () => {
      expect(timingService.formatDelta(1500)).toBe('+1.500');
    });

    it('should format negative delta with - prefix', () => {
      expect(timingService.formatDelta(-1500)).toBe('-1.500');
    });

    it('should handle zero delta', () => {
      // Uses ± for zero delta to indicate no change
      expect(timingService.formatDelta(0)).toBe('±0.000');
    });

    it('should handle small deltas', () => {
      expect(timingService.formatDelta(50)).toBe('+0.050');
    });

    it('should handle large deltas (over 10 seconds)', () => {
      expect(timingService.formatDelta(15500)).toBe('+15.500');
    });
  });

  describe('isPenaltyTime', () => {
    it('should return true for times over 3 minutes', () => {
      expect(timingService.isPenaltyTime(180001)).toBe(true);
    });

    it('should return false for normal times', () => {
      expect(timingService.isPenaltyTime(90000)).toBe(false);
    });

    it('should return false for exactly 3 minutes', () => {
      expect(timingService.isPenaltyTime(180000)).toBe(false);
    });
  });

  describe('filterPenaltyTimes', () => {
    it('should filter out penalty times', () => {
      const times = [60000, 180001, 65000, 200000, 70000];
      expect(timingService.filterPenaltyTimes(times)).toEqual([60000, 65000, 70000]);
    });

    it('should return empty array if all are penalties', () => {
      const times = [180001, 200000, 300000];
      expect(timingService.filterPenaltyTimes(times)).toEqual([]);
    });

    it('should return all times if none are penalties', () => {
      const times = [60000, 65000, 70000];
      expect(timingService.filterPenaltyTimes(times)).toEqual([60000, 65000, 70000]);
    });
  });
});
