import React, { useEffect, useState } from 'react';

const Snowfall: React.FC = () => {
  const [flakes, setFlakes] = useState<number[]>([]);

  useEffect(() => {
    // Generate static flakes on mount to avoid re-render loop
    // Increased count from 50 to 150 for "fine" effect
    const newFlakes = Array.from({ length: 150 }).map((_, i) => i);
    setFlakes(newFlakes);
  }, []);

  return (
    <div className="snow-container">
      {flakes.map((i) => {
        const left = Math.random() * 100;
        const duration = 5 + Math.random() * 10;
        const delay = Math.random() * 5;
        // Reduced size: 1.5px to 4.5px (was 3px to 8px)
        const size = 1.5 + Math.random() * 3;
        
        return (
          <div
            key={i}
            className="snowflake"
            style={{
              left: `${left}%`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              width: `${size}px`,
              height: `${size}px`,
              // Add varying opacity for depth
              opacity: 0.4 + Math.random() * 0.6,
            }}
          />
        );
      })}
    </div>
  );
};

export default React.memo(Snowfall);