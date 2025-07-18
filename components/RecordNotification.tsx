import React, { useEffect, useState } from 'react';
import { TrophyIcon } from './icons';

interface RecordNotificationProps {
  isNewBestLap: boolean;
  isNewBestAverage: boolean;
  playerName: string;
  circuitName: string;
  onClose: () => void;
}

const RecordNotification: React.FC<RecordNotificationProps> = ({
  isNewBestLap,
  isNewBestAverage,
  playerName,
  circuitName,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isNewBestLap || isNewBestAverage) {
      setIsVisible(true);
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isNewBestLap, isNewBestAverage, onClose]);

  if (!isNewBestLap && !isNewBestAverage) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      isVisible ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform translate-x-full'
    }`}>
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black p-4 rounded-lg shadow-2xl border-2 border-yellow-300 min-w-[300px]">
        <div className="flex items-center gap-3">
          <TrophyIcon className="w-8 h-8 text-yellow-800" />
          <div className="flex-1">
            <h3 className="font-bold text-lg">🎉 NEW RECORD!</h3>
            <p className="text-sm opacity-90">
              <strong>{playerName}</strong> set a new record at <strong>{circuitName}</strong>
            </p>
            <div className="mt-1 text-xs">
              {isNewBestLap && <span className="bg-red-200 text-red-800 px-2 py-1 rounded mr-2">Best Lap</span>}
              {isNewBestAverage && <span className="bg-green-200 text-green-800 px-2 py-1 rounded">Best Average</span>}
            </div>
          </div>
          <button 
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-yellow-800 hover:text-black transition-colors ml-2"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordNotification;