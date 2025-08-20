import React, { useState } from 'react';

interface UserAvatarProps {
  imageUrl?: string;
  name?: string;
  className?: string;
  onClick?: () => void;
  title?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  imageUrl, 
  name, 
  className = "w-8 h-8", 
  onClick,
  title 
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(!!imageUrl);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // Show F1 logo fallback if no image or error
  if (!imageUrl || hasError) {
    return (
      <button
        onClick={onClick}
        title={title}
        className={`${className} bg-zinc-700 hover:bg-zinc-600 rounded-full flex items-center justify-center transition-colors ${
          onClick ? 'cursor-pointer' : ''
        }`}
      >
        <img 
          src="https://www.formula1.com/etc/designs/fom-website/images/f1_logo.svg" 
          alt="F1" 
          className="w-4 h-4 brightness-0 invert opacity-80"
        />
      </button>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className={`${className} bg-zinc-700 animate-pulse rounded-full`} />
      )}
      <button
        onClick={onClick}
        title={title}
        className={`${className} rounded-full overflow-hidden hover:ring-2 hover:ring-zinc-400 transition-all ${
          onClick ? 'cursor-pointer' : ''
        }`}
        style={{ display: isLoading ? 'none' : 'block' }}
      >
        <img
          src={imageUrl}
          alt={name || 'Usuario'}
          className="w-full h-full object-cover"
          onError={handleError}
          onLoad={handleLoad}
        />
      </button>
    </div>
  );
};

export default UserAvatar;