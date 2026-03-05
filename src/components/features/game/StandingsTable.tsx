'use client';

/**
 * StandingsTable Component
 * Championship standings table with points and stats
 */

import React from 'react';
import { PositionBadge } from '../../ui/PositionBadge';

export interface StandingEntry {
  playerId: string;
  playerName: string;
  position: number;
  points: number;
  fastestLaps: number;
  bestAverages: number;
  wins: number;
  podiums: number;
}

export interface StandingsTableProps {
  standings: StandingEntry[];
  showStats?: boolean;
  highlightPlayerId?: string;
  className?: string;
}

export function StandingsTable({
  standings,
  showStats = true,
  highlightPlayerId,
  className = '',
}: StandingsTableProps) {
  if (standings.length === 0) {
    return (
      <div className={`bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center ${className}`}>
        <p className="text-zinc-400">No hay clasificación disponible</p>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`grid ${showStats ? 'grid-cols-10' : 'grid-cols-6'} gap-1 px-3 py-2 bg-zinc-800 text-xs font-mono uppercase tracking-wide text-zinc-400`}>
        <div className="col-span-1 text-center">POS</div>
        <div className={showStats ? 'col-span-3' : 'col-span-3'}>PILOTO</div>
        <div className="col-span-2 text-center">PTS</div>
        {showStats && (
          <>
            <div className="col-span-1 text-center" title="Vueltas Rápidas">VR</div>
            <div className="col-span-1 text-center" title="Mejores Promedios">PR</div>
            <div className="col-span-1 text-center" title="Victorias">1°</div>
            <div className="col-span-1 text-center" title="Podios">🏆</div>
          </>
        )}
      </div>

      {/* Rows */}
      <div className="divide-y divide-zinc-800">
        {standings.map((entry) => {
          const isHighlighted = entry.playerId === highlightPlayerId;

          return (
            <div
              key={entry.playerId}
              className={`
                grid ${showStats ? 'grid-cols-10' : 'grid-cols-6'} gap-1 px-3 py-2 items-center
                transition-colors
                ${isHighlighted ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/30'}
              `}
            >
              {/* Position */}
              <div className="col-span-1 flex justify-center">
                <PositionBadge position={entry.position} size="sm" />
              </div>

              {/* Name */}
              <div className={showStats ? 'col-span-3' : 'col-span-3'}>
                <span className={`font-semibold truncate ${isHighlighted ? 'text-zinc-100' : 'text-zinc-200'}`}>
                  {entry.playerName}
                </span>
              </div>

              {/* Points */}
              <div className="col-span-2 text-center">
                <span className="text-lg font-mono font-bold text-zinc-100">
                  {entry.points}
                </span>
              </div>

              {showStats && (
                <>
                  {/* Fastest Laps */}
                  <div className="col-span-1 text-center">
                    <span className={`font-mono ${entry.fastestLaps > 0 ? 'text-purple-400' : 'text-zinc-500'}`}>
                      {entry.fastestLaps}
                    </span>
                  </div>

                  {/* Best Averages */}
                  <div className="col-span-1 text-center">
                    <span className={`font-mono ${entry.bestAverages > 0 ? 'text-cyan-400' : 'text-zinc-500'}`}>
                      {entry.bestAverages}
                    </span>
                  </div>

                  {/* Wins */}
                  <div className="col-span-1 text-center">
                    <span className={`font-mono ${entry.wins > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                      {entry.wins}
                    </span>
                  </div>

                  {/* Podiums */}
                  <div className="col-span-1 text-center">
                    <span className={`font-mono ${entry.podiums > 0 ? 'text-zinc-200' : 'text-zinc-500'}`}>
                      {entry.podiums}
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StandingsTable;
