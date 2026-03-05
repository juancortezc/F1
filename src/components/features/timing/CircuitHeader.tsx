'use client';

/**
 * CircuitHeader Component
 * Displays current circuit info and turn/lap progress
 */

import React from 'react';

export interface CircuitHeaderProps {
  circuitName: string;
  circuitImage?: string;
  currentTurn: number;
  totalTurns: number;
  currentLap?: number;
  totalLaps?: number;
  currentPlayerName?: string;
  className?: string;
}

export function CircuitHeader({
  circuitName,
  circuitImage,
  currentTurn,
  totalTurns,
  currentLap,
  totalLaps,
  currentPlayerName,
  className = '',
}: CircuitHeaderProps) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-4">
        {/* Circuit Image */}
        {circuitImage && (
          <div className="w-16 h-12 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
            <img
              src={circuitImage}
              alt={circuitName}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-zinc-100 truncate">{circuitName}</h2>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm text-zinc-400">
              Turno{' '}
              <span className="font-mono font-bold text-zinc-200">
                {currentTurn}/{totalTurns}
              </span>
            </span>
            {currentLap !== undefined && totalLaps !== undefined && (
              <span className="text-sm text-zinc-400">
                Vuelta{' '}
                <span className="font-mono font-bold text-zinc-200">
                  {currentLap}/{totalLaps}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Current Player Badge */}
        {currentPlayerName && (
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-zinc-500 uppercase">Corriendo</p>
            <p className="text-lg font-bold text-amber-400">{currentPlayerName}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CircuitHeader;
