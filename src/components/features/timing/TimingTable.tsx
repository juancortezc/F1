'use client';

/**
 * TimingTable Component
 * F1-style live timing table with position colors and delta times
 */

import React from 'react';
import { PositionBadge } from '../../ui/PositionBadge';
import { TimeDisplay, DeltaDisplay } from '../../ui/TimeDisplay';

export interface TimingEntry {
  playerId: string;
  playerName: string;
  position: number;
  bestLapMs: number | null;
  lastLapMs: number | null;
  deltaToLeader: number | null;
  lapsCompleted: number;
  isCurrentPlayer?: boolean;
  hasFastestLap?: boolean;
}

export interface TimingTableProps {
  entries: TimingEntry[];
  showDelta?: boolean;
  highlightCurrentPlayer?: boolean;
  currentPlayerId?: string;
  className?: string;
}

export function TimingTable({
  entries,
  showDelta = true,
  highlightCurrentPlayer = true,
  currentPlayerId,
  className = '',
}: TimingTableProps) {
  if (entries.length === 0) {
    return (
      <div className={`bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center ${className}`}>
        <p className="text-zinc-400">No hay datos de timing disponibles</p>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-zinc-800 text-xs font-mono uppercase tracking-wide text-zinc-400">
        <div className="col-span-1 text-center">POS</div>
        <div className="col-span-4">PILOTO</div>
        <div className="col-span-3 text-right">MEJOR</div>
        <div className="col-span-2 text-right">ÚLTIMA</div>
        <div className="col-span-2 text-right">DELTA</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-zinc-800">
        {entries.map((entry) => {
          const isHighlighted = highlightCurrentPlayer && entry.playerId === currentPlayerId;

          return (
            <div
              key={entry.playerId}
              className={`
                grid grid-cols-12 gap-2 px-3 py-2 items-center
                transition-colors
                ${isHighlighted ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/30'}
              `}
            >
              {/* Position */}
              <div className="col-span-1 flex justify-center">
                <PositionBadge position={entry.position} size="sm" />
              </div>

              {/* Name */}
              <div className="col-span-4 flex items-center gap-2">
                <span className={`font-semibold truncate ${isHighlighted ? 'text-zinc-100' : 'text-zinc-200'}`}>
                  {entry.playerName}
                </span>
                {entry.hasFastestLap && (
                  <span className="text-purple-400 text-xs">VR</span>
                )}
              </div>

              {/* Best Lap */}
              <div className="col-span-3 text-right">
                <TimeDisplay
                  timeMs={entry.bestLapMs}
                  size="sm"
                  bold={entry.hasFastestLap}
                  className={entry.hasFastestLap ? 'text-purple-400' : ''}
                />
              </div>

              {/* Last Lap */}
              <div className="col-span-2 text-right">
                <TimeDisplay
                  timeMs={entry.lastLapMs}
                  size="sm"
                  placeholder="--"
                />
              </div>

              {/* Delta to Leader */}
              <div className="col-span-2 text-right">
                {showDelta && entry.position > 1 ? (
                  <DeltaDisplay deltaMs={entry.deltaToLeader} size="sm" />
                ) : entry.position === 1 ? (
                  <span className="text-sm text-zinc-400">---</span>
                ) : (
                  <span className="text-sm text-zinc-500">--</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TimingTable;
