import React, { useEffect, useCallback } from 'react';
import { useToast } from './Toast';

interface Shortcut {
  key: string;
  description: string;
  action: () => void;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

interface KeyboardShortcutsProps {
  shortcuts: Shortcut[];
  enabled?: boolean;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ 
  shortcuts, 
  enabled = true 
}) => {
  const { addToast } = useToast();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Don't trigger shortcuts when typing in inputs
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      return event.key.toLowerCase() === shortcut.key.toLowerCase() &&
             !!event.ctrlKey === !!shortcut.ctrlKey &&
             !!event.altKey === !!shortcut.altKey &&
             !!event.shiftKey === !!shortcut.shiftKey;
    });

    if (matchingShortcut) {
      event.preventDefault();
      matchingShortcut.action();
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null; // This component doesn't render anything
};

// Keyboard shortcuts help modal
interface KeyboardHelpProps {
  shortcuts: Shortcut[];
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardHelp: React.FC<KeyboardHelpProps> = ({ 
  shortcuts, 
  isOpen, 
  onClose 
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatShortcut = (shortcut: Shortcut) => {
    const keys = [];
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.altKey) keys.push('Alt');
    if (shortcut.shiftKey) keys.push('Shift');
    keys.push(shortcut.key.toUpperCase());
    return keys.join(' + ');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl border border-slate-600 shadow-2xl max-w-md w-full max-h-96 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-100">Atajos de Teclado</h3>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <span className="text-slate-300 text-sm">{shortcut.description}</span>
                <kbd className="bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs font-mono">
                  {formatShortcut(shortcut)}
                </kbd>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-700">
            <p className="text-slate-500 text-xs">
              Presiona <kbd className="bg-slate-700 px-1 rounded">?</kbd> para mostrar/ocultar esta ayuda
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;