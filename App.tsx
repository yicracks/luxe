import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { CastleScene } from './components/CastleScene'; // Pink Supercar
import { playBellSound, toggleDisneyMusic } from './utils/audioUtils';

// Helper for Diamond Studs on the Base
const DiamondStuds = () => {
    // Generate static positions for diamonds
    const studs = useMemo(() => {
        return Array.from({ length: 40 }).map((_, i) => ({
            left: `${Math.random() * 90 + 5}%`,
            top: `${Math.random() * 80 + 10}%`,
            size: Math.random() * 3 + 1, // 1px to 4px
            delay: Math.random() * 3,
        }));
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
            {studs.map((s, i) => (
                <div 
                    key={i}
                    className="absolute rounded-full bg-white animate-twinkle shadow-[0_0_4px_white]"
                    style={{
                        left: s.left,
                        top: s.top,
                        width: `${s.size}px`,
                        height: `${s.size}px`,
                        animationDelay: `${s.delay}s`,
                        opacity: 0.8
                    }}
                />
            ))}
        </div>
    );
};

export default function App() {
  const [isLightsOn, setIsLightsOn] = useState(false);

  // Toggle Music and Visuals
  const handleToggleLights = () => {
    const newState = !isLightsOn;
    setIsLightsOn(newState);
    toggleDisneyMusic(newState);
    
    if (newState) {
       document.body.classList.add('active-mode');
    } else {
       document.body.classList.remove('active-mode');
    }
  };

  const handleInteract = useCallback(() => {
    playBellSound();
  }, []);

  // Stop music on unmount
  useEffect(() => {
    return () => toggleDisneyMusic(false);
  }, []);

  return (
    <div className={`relative w-full h-screen overflow-hidden flex flex-col items-center justify-center transition-colors duration-1000 ${isLightsOn ? "bg-[#380e22]" : "bg-black"}`}>
      
      {/* Background Ambience */}
      <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,#831843_0%,#000_100%)] pointer-events-none transition-opacity duration-1000 ${isLightsOn ? 'opacity-80' : 'opacity-0'}`}></div>

      {/* --- The Crystal Globe --- */}
      <div className="relative z-10 scale-75 md:scale-100 transition-transform duration-700">
        
        {/* Glass Sphere */}
        <div className="relative w-[500px] h-[500px] rounded-full globe-shadow border border-white/10 bg-black/40 backdrop-blur-[1px] overflow-hidden z-20" onClick={handleInteract}>
          
          {/* Internal Shine/Reflection layers */}
          <div className="glass-shine"></div>
          <div className="glass-shine-2"></div>

          {/* Scene Content */}
          <div className="absolute inset-0 flex justify-center items-center">
             {/* Canvas Container - pointer-events-auto enables clicking the car */}
             <div className="relative w-full h-full pointer-events-auto">
                <CastleScene isLightsOn={isLightsOn} />
             </div>
          </div>
        </div>

        {/* --- The Base (Pink & Diamond Studded) --- */}
        <div className="relative -mt-3 flex flex-col items-center z-10">
           {/* Top Rim */}
           <div className="w-[420px] h-6 bg-gradient-to-r from-pink-900 via-rose-300 to-pink-900 rounded-[50%] shadow-[0_0_15px_rgba(255,255,255,0.3)] border-t border-white/40 z-20"></div>
           
           {/* Main Base Body */}
           <div className="w-[380px] h-24 bg-gradient-to-b from-rose-950 via-pink-900 to-black relative flex items-center justify-center shadow-2xl"
                style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' }}>
               
               {/* 1. Base Texture (Glossy Pink Metal) */}
               <div className="absolute inset-0 opacity-60 bg-gradient-to-tr from-black via-transparent to-white/20"></div>
               
               {/* 2. Diamond Studs Layer */}
               <DiamondStuds />

               {/* Plaque / Switch Area */}
               <div className="relative z-20 flex flex-col items-center justify-center gap-2">
                   
                   {/* The Switch Button (Gem-like) */}
                   <button 
                      onClick={handleToggleLights}
                      className={`group relative w-16 h-16 rounded-full border-[3px] transition-all duration-300 shadow-xl overflow-hidden flex items-center justify-center
                        ${isLightsOn 
                            ? 'border-pink-300 bg-pink-600 shadow-[0_0_30px_#ec4899] scale-105' 
                            : 'border-rose-800 bg-gray-900'}`}
                   >
                      <span className={`text-[10px] font-bold tracking-widest transition-colors ${isLightsOn ? 'text-white drop-shadow-md' : 'text-gray-500'}`}>
                          {isLightsOn ? 'FLY' : 'START'}
                      </span>
                      
                      {/* Click Feedback Ripple */}
                      <div className="absolute inset-0 rounded-full border border-white/50 scale-125 opacity-0 group-active:scale-100 group-active:opacity-100 transition-all"></div>
                   </button>
                   
                   {/* Label below button */}
                   <div className="h-[2px] w-12 bg-rose-800 mt-1 rounded-full shadow-[0_0_5px_#f43f5e]"></div>
               </div>
           </div>

           {/* Bottom Base Foot */}
           <div className="w-[400px] h-4 bg-gradient-to-r from-black via-pink-950 to-black rounded-full -mt-2 shadow-[0_10px_30px_rgba(236,72,153,0.3)]"></div>
        </div>

      </div>

    </div>
  );
}
