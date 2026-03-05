'use client';

/**
 * PlayerForm Component
 * Form for creating/editing players and guests
 */

import React, { useState, useEffect } from 'react';
import type { Player } from '../../../../types';
import { Modal } from '../../ui/Modal';
import { Input, Button } from '../../ui/Form';

export interface PlayerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Player>) => Promise<void>;
  player?: Player | null;
  isGuest?: boolean;
}

export function PlayerForm({
  isOpen,
  onClose,
  onSave,
  player,
  isGuest = false,
}: PlayerFormProps) {
  const isNew = !player;
  const title = isNew
    ? isGuest
      ? 'Nuevo Invitado'
      : 'Nuevo Jugador'
    : isGuest
      ? 'Editar Invitado'
      : 'Editar Jugador';

  const [formData, setFormData] = useState({
    name: '',
    pin: '',
    imageUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (player) {
      setFormData({
        name: player.name || '',
        pin: player.pin || '',
        imageUrl: player.imageUrl || '',
      });
    } else {
      setFormData({
        name: '',
        pin: '',
        imageUrl: isGuest ? '/avatars/guest-default.png' : '',
      });
    }
    setError(null);
  }, [player, isGuest, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate
      if (!formData.name.trim()) {
        throw new Error('El nombre es requerido');
      }

      if (!isGuest && !formData.pin.match(/^\d{4}$/)) {
        throw new Error('El PIN debe ser de 4 dígitos');
      }

      const data: Partial<Player> = {
        name: formData.name.trim(),
        imageUrl: formData.imageUrl || '/avatars/default.png',
        isGuest,
      };

      // Only include PIN for regular players
      if (!isGuest) {
        data.pin = formData.pin;
      }

      await onSave(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-md text-red-400 text-sm">
            {error}
          </div>
        )}

        <Input
          label="Nombre"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={isGuest ? 'Nombre del invitado' : 'Nombre del jugador'}
          required
        />

        {!isGuest && (
          <Input
            label="PIN"
            value={formData.pin}
            onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
            placeholder="4 dígitos"
            maxLength={4}
            pattern="\d{4}"
            required
          />
        )}

        <Input
          label="URL de Imagen (opcional)"
          value={formData.imageUrl}
          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
          placeholder="/avatars/player.png"
        />

        {/* Preview */}
        {formData.imageUrl && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">Preview:</span>
            <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden">
              <img
                src={formData.imageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/avatars/default.png';
                }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
          >
            {isNew ? 'Crear' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default PlayerForm;
