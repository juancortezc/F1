'use client';

/**
 * RecordsCard Component
 * Displays circuit historical and session records
 */

import React from 'react';
import { Card, StatCard } from '../../ui/Card';
import { TimeDisplay } from '../../ui/TimeDisplay';

export interface RecordHolder {
  name: string;
  timeMs: number;
}

export interface RecordsCardProps {
  circuitName?: string;
  historicalBestLap?: RecordHolder | null;
  historicalBestAverage?: RecordHolder | null;
  sessionBestLap?: RecordHolder | null;
  sessionBestAverage?: RecordHolder | null;
  className?: string;
}

export function RecordsCard({
  circuitName,
  historicalBestLap,
  historicalBestAverage,
  sessionBestLap,
  sessionBestAverage,
  className = '',
}: RecordsCardProps) {
  return (
    <Card
      title={circuitName ? `Récords - ${circuitName}` : 'Récords'}
      className={className}
      padding="sm"
    >
      <div className="grid grid-cols-2 gap-3">
        {/* Historical Best Lap */}
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <p className="text-xs font-mono uppercase tracking-wide text-zinc-500 mb-1">
            Vuelta Rápida (Histórico)
          </p>
          {historicalBestLap ? (
            <>
              <TimeDisplay
                timeMs={historicalBestLap.timeMs}
                size="lg"
                bold
                className="text-purple-400"
              />
              <p className="text-xs text-zinc-400 mt-1">{historicalBestLap.name}</p>
            </>
          ) : (
            <p className="text-lg text-zinc-600">Sin récord</p>
          )}
        </div>

        {/* Historical Best Average */}
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <p className="text-xs font-mono uppercase tracking-wide text-zinc-500 mb-1">
            Mejor Promedio (Histórico)
          </p>
          {historicalBestAverage ? (
            <>
              <TimeDisplay
                timeMs={historicalBestAverage.timeMs}
                size="lg"
                bold
                className="text-cyan-400"
              />
              <p className="text-xs text-zinc-400 mt-1">{historicalBestAverage.name}</p>
            </>
          ) : (
            <p className="text-lg text-zinc-600">Sin récord</p>
          )}
        </div>

        {/* Session Best Lap */}
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <p className="text-xs font-mono uppercase tracking-wide text-zinc-500 mb-1">
            Vuelta Rápida (Sesión)
          </p>
          {sessionBestLap ? (
            <>
              <TimeDisplay
                timeMs={sessionBestLap.timeMs}
                size="md"
                bold
                className="text-green-400"
              />
              <p className="text-xs text-zinc-400 mt-1">{sessionBestLap.name}</p>
            </>
          ) : (
            <p className="text-zinc-600">--:--.---</p>
          )}
        </div>

        {/* Session Best Average */}
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <p className="text-xs font-mono uppercase tracking-wide text-zinc-500 mb-1">
            Mejor Promedio (Sesión)
          </p>
          {sessionBestAverage ? (
            <>
              <TimeDisplay
                timeMs={sessionBestAverage.timeMs}
                size="md"
                bold
              />
              <p className="text-xs text-zinc-400 mt-1">{sessionBestAverage.name}</p>
            </>
          ) : (
            <p className="text-zinc-600">--:--.---</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default RecordsCard;
