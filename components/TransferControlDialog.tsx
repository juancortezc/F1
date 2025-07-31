import React, { useState } from 'react';

interface TransferControlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (newControllerId: string) => void;
  participantUsers: { userId: string; name: string; role: 'controller' | 'spectator' }[];
  currentControllerId: string;
}

const TransferControlDialog: React.FC<TransferControlDialogProps> = ({
  isOpen,
  onClose,
  onTransfer,
  participantUsers,
  currentControllerId
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  if (!isOpen) return null;

  const availableUsers = participantUsers.filter(user => 
    user.userId !== currentControllerId && user.role === 'controller'
  );

  const handleTransfer = () => {
    if (selectedUserId) {
      onTransfer(selectedUserId);
      onClose();
      setSelectedUserId('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-slate-100 mb-4">
          ¿A quién le pasas el control?
        </h2>
        
        <div className="space-y-3 mb-6">
          {availableUsers.map((user) => (
            <label
              key={user.userId}
              className="flex items-center p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors"
            >
              <input
                type="radio"
                name="newController"
                value={user.userId}
                checked={selectedUserId === user.userId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="mr-3 text-[#FF1801]"
              />
              <span className="text-slate-100 font-medium">{user.name}</span>
            </label>
          ))}
          
          {availableUsers.length === 0 && (
            <p className="text-slate-400 text-center py-4">
              No hay otros usuarios disponibles
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Mantener Control
          </button>
          <button
            onClick={handleTransfer}
            disabled={!selectedUserId}
            className="flex-1 bg-[#FF1801] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#E61601] disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
          >
            Transferir
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferControlDialog;