import React from 'react';

interface AnimatedSectionProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  className?: string;
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}) => {
  const getDirectionClass = () => {
    switch (direction) {
      case 'up':
        return 'translate-y-8';
      case 'down':
        return '-translate-y-8';
      case 'left':
        return 'translate-x-8';
      case 'right':
        return '-translate-x-8';
      default:
        return '';
    }
  };

  return (
    <div
      className={`animate-on-scroll ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        ['--animate-direction' as string]: getDirectionClass(),
      }}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;
