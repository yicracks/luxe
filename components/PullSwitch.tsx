import React, { useState } from 'react';

interface PullSwitchProps {
  onToggle: () => void;
  isOn: boolean;
}

export const PullSwitch: React.FC<PullSwitchProps> = ({ onToggle, isOn }) => {
  const [isPulling, setIsPulling] = useState(false);

  const handleClick = () => {
    setIsPulling(true);
    // Sound effect trigger could go here
    onToggle();
    setTimeout(() => setIsPulling(false), 600); // Reset animation state
  };

  return (
    <div className="absolute top-0 right-[15%] z-50 flex flex-col items-center">
      {/* The Cord */}
      <div 
        className={`w-[2px] bg-gradient-to-b from-gray-700 via-gray-400 to-yellow-200 origin-top transition-transform duration-500 ease-out
            ${isPulling ? 'h-[160px]' : 'h-[120px]'}`}
        style={{ boxShadow: '0 0 5px rgba(255,255,255,0.2)' }}
      ></div>

      {/* The Handle (Crystal/Gold Ring) */}
      <div 
        onClick={handleClick}
        className={`cursor-pointer -mt-1 relative group transform transition-all duration-300
            ${isPulling ? 'translate-y-8' : 'translate-y-0 hover:translate-y-1'}`}
      >
        {/* Glow */}
        <div className={`absolute inset-0 rounded-full blur-md transition-opacity duration-500
            ${isOn ? 'bg-yellow-400 opacity-60' : 'bg-white opacity-20'}`}></div>

        {/* Physical handle */}
        <div className="relative w-8 h-8 rounded-full border-2 border-white/40 bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg">
           <div className={`w-2 h-2 rounded-full transition-colors duration-500
               ${isOn ? 'bg-yellow-300 shadow-[0_0_10px_#fde047]' : 'bg-white/50'}`}></div>
        </div>
        
        {/* Tassel or bottom detail */}
        <div className="mx-auto w-[2px] h-4 bg-white/40"></div>
      </div>
    </div>
  );
};
