import React, { useState } from 'react';

interface CircuitImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

const CircuitImage: React.FC<CircuitImageProps> = ({ 
  src, 
  alt, 
  className = "", 
  fallbackClassName = "" 
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (hasError) {
    // Fallback: Show a placeholder with circuit icon
    return (
      <div className={`bg-zinc-700 flex items-center justify-center ${className} ${fallbackClassName}`}>
        <svg 
          className="w-6 h-6 text-zinc-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V6.618a1 1 0 01.553-.894L9 3l6 3 5.447-2.724A1 1 0 0121 4.382v9.764a1 1 0 01-.553.894L15 18l-6-3z" 
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className={`absolute inset-0 bg-zinc-700 animate-pulse ${className}`} />
      )}
      <img
        src={src}
        alt={alt}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </div>
  );
};

export default CircuitImage;