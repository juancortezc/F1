'use client';

/**
 * HallOfFameCard Component
 * Displays hall of fame entry for a player
 */

import React from 'react';
import { Card } from '../../ui/Card';
import { TimeDisplay } from '../../ui/TimeDisplay';

export interface HallOfFameEntry {
  playerId: string;
  playerName: string;
  championships: number;
  totalWins: number;
  fastestLaps: number;
  bestAverages: number;
  bestLapTime?: number | null;
  bestLapCircuit?: string;
}

export interface HallOfFameCardProps {
  entry: HallOfFameEntry;
  rank: number;
  className?: string;
}

export function HallOfFameCard({ entry, rank, className = '' }: HallOfFameCardProps) {
  const getRankColor = () => {
    switch (rank) {
      case 1:
        return 'border-amber-400 bg-amber-400/10';
      case 2:
        return 'border-zinc-300 bg-zinc-300/10';
      case 3:
        return 'border-amber-600 bg-amber-600/10';
      default:
        return 'border-zinc-800';
    }
  };

  const getRankBadge = () => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  return (
    <div className={`bg-zinc-900 border-2 ${getRankColor()} rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getRankBadge()}</span>
          <div>
            <h3 className="text-lg font-bold text-zinc-100">{entry.playerName}</h3>
            <p className="text-sm text-zinc-400">
              {entry.championships} {entry.championships === 1 ? 'campeonato' : 'campeonatos'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-800/50 rounded p-2">
          <p className="text-xs text-zinc-500 uppercase">Victorias</p>
          <p className="text-xl font-mono font-bold text-amber-400">{entry.totalWins}</p>
        </div>

        <div className="bg-zinc-800/50 rounded p-2">
          <p className="text-xs text-zinc-500 uppercase">Vueltas Rápidas</p>
          <p className="text-xl font-mono font-bold text-purple-400">{entry.fastestLaps}</p>
        </div>

        <div className="bg-zinc-800/50 rounded p-2">
          <p className="text-xs text-zinc-500 uppercase">Mejores Promedios</p>
          <p className="text-xl font-mono font-bold text-cyan-400">{entry.bestAverages}</p>
        </div>

        {entry.bestLapTime && (
          <div className="bg-zinc-800/50 rounded p-2">
            <p className="text-xs text-zinc-500 uppercase">Mejor Tiempo</p>
            <TimeDisplay timeMs={entry.bestLapTime} size="lg" bold className="text-green-400" />
            {entry.bestLapCircuit && (
              <p className="text-xs text-zinc-500 mt-0.5">{entry.bestLapCircuit}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * HallOfFameList Component
 * Displays a list of hall of fame entries
 */
export interface HallOfFameListProps {
  entries: HallOfFameEntry[];
  className?: string;
}

export function HallOfFameList({ entries, className = '' }: HallOfFameListProps) {
  if (entries.length === 0) {
    return (
      <div className={`bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center ${className}`}>
        <p className="text-zinc-400">No hay datos en el Hall of Fame</p>
        <p className="text-sm text-zinc-500 mt-2">Completa campeonatos para aparecer aquí</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {entries.map((entry, index) => (
        <HallOfFameCard key={entry.playerId} entry={entry} rank={index + 1} />
      ))}
    </div>
  );
}

export default HallOfFameCard;
