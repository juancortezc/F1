import { describe, it, expect } from 'vitest';
import { ScoringService } from '../../../domain/services/ScoringService';

describe('ScoringService', () => {
  const scoringService = new ScoringService();

  describe('getPositionPoints', () => {
    it('should return correct default points for 1st place', () => {
      expect(scoringService.getPositionPoints(1, 4)).toBe(3); // Default: 3
    });

    it('should return correct default points for 2nd place', () => {
      expect(scoringService.getPositionPoints(2, 4)).toBe(2); // Default: 2
    });

    it('should return correct default points for 3rd place', () => {
      expect(scoringService.getPositionPoints(3, 4)).toBe(1); // Default: 1
    });

    it('should return 0 for 4th place and beyond', () => {
      expect(scoringService.getPositionPoints(4, 4)).toBe(0);
    });

    it('should return 0 for positions beyond defined points', () => {
      expect(scoringService.getPositionPoints(20, 20)).toBe(0);
    });

    it('should use custom points from settings', () => {
      const settings = {
        first: 30,
        second: 20,
        third: 10,
      };
      expect(scoringService.getPositionPoints(1, 4, settings)).toBe(30);
      expect(scoringService.getPositionPoints(2, 4, settings)).toBe(20);
      expect(scoringService.getPositionPoints(3, 4, settings)).toBe(10);
    });
  });

  describe('calculateTurnScore', () => {
    it('should calculate score based on average time', () => {
      const lapTimes = [60000, 61000, 62000]; // avg = 61000
      const score = scoringService.calculateTurnScore(lapTimes, 'average', false);
      expect(score).toBe(61000);
    });

    it('should calculate score based on best lap', () => {
      const lapTimes = [60000, 61000, 62000];
      const score = scoringService.calculateTurnScore(lapTimes, 'lap', false);
      expect(score).toBe(60000);
    });

    it('should use best 4 of 5 when enabled', () => {
      const lapTimes = [60000, 65000, 61000, 62000, 63000];
      // Best 4: 60, 61, 62, 63 = avg 61.5
      const score = scoringService.calculateTurnScore(lapTimes, 'average', true);
      expect(score).toBe(61500);
    });

    it('should return 0 for empty lap times', () => {
      expect(scoringService.calculateTurnScore([], 'average', false)).toBe(0);
    });
  });

  describe('calculateBonusPoints', () => {
    it('should return points for best lap only', () => {
      const settings = { pointsForBestLap: 5, pointsForBestAverage: 3 };
      expect(scoringService.calculateBonusPoints(true, false, settings)).toBe(5);
    });

    it('should return points for best average only', () => {
      const settings = { pointsForBestLap: 5, pointsForBestAverage: 3 };
      expect(scoringService.calculateBonusPoints(false, true, settings)).toBe(3);
    });

    it('should return combined points for both', () => {
      const settings = { pointsForBestLap: 5, pointsForBestAverage: 3 };
      expect(scoringService.calculateBonusPoints(true, true, settings)).toBe(8);
    });

    it('should return 0 when no bonus', () => {
      const settings = { pointsForBestLap: 5, pointsForBestAverage: 3 };
      expect(scoringService.calculateBonusPoints(false, false, settings)).toBe(0);
    });

    it('should use default points when no settings provided', () => {
      expect(scoringService.calculateBonusPoints(true, false)).toBe(1); // default
    });
  });

  describe('sortByPosition', () => {
    it('should sort players by score (lower is better)', () => {
      const players = [
        { id: 'a', score: 65000 },
        { id: 'b', score: 60000 },
        { id: 'c', score: 62000 },
      ];
      const sorted = scoringService.sortByPosition(players);
      expect(sorted[0].id).toBe('b');
      expect(sorted[1].id).toBe('c');
      expect(sorted[2].id).toBe('a');
    });

    it('should handle equal scores', () => {
      const players = [
        { id: 'a', score: 60000 },
        { id: 'b', score: 60000 },
      ];
      const sorted = scoringService.sortByPosition(players);
      expect(sorted.length).toBe(2);
    });
  });

  describe('assignPositions', () => {
    it('should assign sequential positions', () => {
      const players = [
        { id: 'a', score: 60000 },
        { id: 'b', score: 62000 },
        { id: 'c', score: 65000 },
      ];
      const withPositions = scoringService.assignPositions(players);
      expect(withPositions[0].position).toBe(1);
      expect(withPositions[1].position).toBe(2);
      expect(withPositions[2].position).toBe(3);
    });
  });
});
