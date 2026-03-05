'use client';

/**
 * PlayerList Component
 * Displays and manages players in admin panel
 */

import React from 'react';
import type { Player } from '../../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Form';

export interface PlayerListProps {
  players: Player[];
  onEdit: (player: Player) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  isGuest?: boolean;
  title?: string;
}

export function PlayerList({
  players,
  onEdit,
  onDelete,
  onAdd,
  isGuest = false,
  title,
}: PlayerListProps) {
  const displayTitle = title || (isGuest ? 'Invitados' : 'Jugadores');
  const emptyMessage = isGuest
    ? 'No hay invitados registrados'
    : 'No hay jugadores registrados';
  const addButtonText = isGuest ? 'Agregar Invitado' : 'Agregar Jugador';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-100">{displayTitle}</h2>
        <Button variant="secondary" size="sm" onClick={onAdd}>
          + {addButtonText}
        </Button>
      </div>

      {/* List */}
      {players.length === 0 ? (
        <Card padding="md">
          <p className="text-zinc-400 text-center">{emptyMessage}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                  {player.imageUrl ? (
                    <img
                      src={player.imageUrl}
                      alt={player.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">
                      {isGuest ? '👤' : player.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div>
                  <p className="font-semibold text-zinc-100">{player.name}</p>
                  <p className="text-xs text-zinc-400">
                    PIN: {player.pin}
                    {isGuest && (
                      <span className="ml-2 px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-300">
                        INVITADO
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(player)}
                  className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
                  aria-label="Editar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar a ${player.name}?`)) {
                      onDelete(player.id);
                    }
                  }}
                  className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                  aria-label="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlayerList;
