'use client';

/**
 * CircuitForm Component
 * Form for creating/editing circuits
 */

import React, { useState, useEffect } from 'react';
import type { Circuit } from '../../../../types';
import { Modal } from '../../ui/Modal';
import { Input, Button } from '../../ui/Form';

export interface CircuitFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Circuit>) => Promise<void>;
  circuit?: Circuit | null;
}

export function CircuitForm({
  isOpen,
  onClose,
  onSave,
  circuit,
}: CircuitFormProps) {
  const isNew = !circuit;
  const title = isNew ? 'Nuevo Circuito' : 'Editar Circuito';

  const [formData, setFormData] = useState({
    name: '',
    imageUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (circuit) {
      setFormData({
        name: circuit.name || '',
        imageUrl: circuit.imageUrl || '',
      });
    } else {
      setFormData({
        name: '',
        imageUrl: '',
      });
    }
    setError(null);
  }, [circuit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate
      if (!formData.name.trim()) {
        throw new Error('El nombre es requerido');
      }

      const data: Partial<Circuit> = {
        name: formData.name.trim(),
        imageUrl: formData.imageUrl || '/circuits/default.png',
      };

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
          label="Nombre del Circuito"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ej: Monaco, Spa-Francorchamps"
          required
        />

        <Input
          label="URL de Imagen (opcional)"
          value={formData.imageUrl}
          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
          placeholder="/circuits/monaco.png"
        />

        {/* Preview */}
        {formData.imageUrl && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">Preview:</span>
            <div className="w-16 h-10 rounded bg-zinc-700 overflow-hidden">
              <img
                src={formData.imageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/circuits/default.png';
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

export default CircuitForm;
