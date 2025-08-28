import React, { useEffect, useState } from 'react';

// Fade In Animation Wrapper
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const FadeIn: React.FC<FadeInProps> = ({ 
  children, 
  delay = 0, 
  duration = 300,
  className = '',
  direction = 'up'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const getTransformClass = () => {
    const directionMap = {
      up: 'translate-y-4',
      down: '-translate-y-4',
      left: 'translate-x-4',
      right: '-translate-x-4'
    };
    return directionMap[direction];
  };

  return (
    <div
      className={`
        transition-all ease-out
        ${isVisible ? 'opacity-100 transform-none' : `opacity-0 ${getTransformClass()}`}
        ${className}
      `}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
};

// Scale Animation for Buttons
interface ScaleOnHoverProps {
  children: React.ReactNode;
  scale?: number;
  className?: string;
}

export const ScaleOnHover: React.FC<ScaleOnHoverProps> = ({ 
  children, 
  scale = 1.02,
  className = ''
}) => (
  <div 
    className={`
      transition-transform duration-200 ease-out
      hover:scale-[${scale}] active:scale-[0.98]
      ${className}
    `}
  >
    {children}
  </div>
);

// Pulse Animation for Loading States
interface PulseProps {
  children: React.ReactNode;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export const Pulse: React.FC<PulseProps> = ({ 
  children, 
  intensity = 'medium',
  className = ''
}) => {
  const getIntensityClass = () => {
    switch (intensity) {
      case 'low': return 'animate-pulse';
      case 'medium': return 'animate-pulse';
      case 'high': return 'animate-pulse';
      default: return 'animate-pulse';
    }
  };

  return (
    <div className={`${getIntensityClass()} ${className}`}>
      {children}
    </div>
  );
};

// Slide In Animation for Modals/Drawers
interface SlideInProps {
  children: React.ReactNode;
  isOpen: boolean;
  direction?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const SlideIn: React.FC<SlideInProps> = ({
  children,
  isOpen,
  direction = 'bottom',
  className = ''
}) => {
  const getTransformClass = () => {
    const transformMap = {
      top: isOpen ? 'translate-y-0' : '-translate-y-full',
      bottom: isOpen ? 'translate-y-0' : 'translate-y-full',
      left: isOpen ? 'translate-x-0' : '-translate-x-full',
      right: isOpen ? 'translate-x-0' : 'translate-x-full'
    };
    return transformMap[direction];
  };

  return (
    <div 
      className={`
        transform transition-transform duration-300 ease-out
        ${getTransformClass()}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// Stagger Animation for Lists
interface StaggerProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const Stagger: React.FC<StaggerProps> = ({ 
  children, 
  delay = 50,
  className = ''
}) => {
  const [visibleItems, setVisibleItems] = useState<number>(0);
  const childrenArray = React.Children.toArray(children);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleItems(prev => {
        if (prev < childrenArray.length) {
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, delay);

    return () => clearInterval(timer);
  }, [childrenArray.length, delay]);

  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <div
          key={index}
          className={`
            transition-all duration-300 ease-out
            ${index < visibleItems 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-4'
            }
          `}
          style={{ transitionDelay: `${index * delay}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

// Bounce Animation for Success States
interface BounceProps {
  children: React.ReactNode;
  trigger?: boolean;
  className?: string;
}

export const Bounce: React.FC<BounceProps> = ({ 
  children, 
  trigger = false,
  className = ''
}) => (
  <div 
    className={`
      transition-transform duration-500 ease-out
      ${trigger ? 'animate-bounce' : ''}
      ${className}
    `}
  >
    {children}
  </div>
);

// Shake Animation for Error States
interface ShakeProps {
  children: React.ReactNode;
  trigger?: boolean;
  className?: string;
}

export const Shake: React.FC<ShakeProps> = ({ 
  children, 
  trigger = false,
  className = ''
}) => (
  <div 
    className={`
      ${trigger ? 'animate-f1-shake' : ''}
      ${className}
    `}
  >
    {children}
  </div>
);

// Glow Effect for Important Elements
interface GlowProps {
  children: React.ReactNode;
  color?: 'gold' | 'red' | 'silver';
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export const Glow: React.FC<GlowProps> = ({ 
  children, 
  color = 'gold',
  intensity = 'medium',
  className = ''
}) => {
  const getGlowClass = () => {
    const colorMap = {
      gold: 'shadow-f1-gold',
      red: 'shadow-f1-red',
      silver: 'shadow-f1-silver'
    };
    
    const intensityMap = {
      low: 'shadow-sm',
      medium: 'shadow-md',
      high: 'shadow-lg'
    };
    
    return `${colorMap[color]} ${intensityMap[intensity]}`;
  };

  return (
    <div className={`${getGlowClass()} ${className}`}>
      {children}
    </div>
  );
};