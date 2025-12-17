import React from 'react';
import { GiftState } from '../types';

interface GiftBoxProps {
  gift: GiftState;
  onOpen: (id: string) => void;
}

export const GiftBox: React.FC<GiftBoxProps> = ({ gift, onOpen }) => {
  const { id, isOpen, content, x, y, rotation } = gift;
  const Icon = content.icon;

  const handleClick = () => {
    // Toggle logic is handled in App.tsx now, we just pass the ID
    onOpen(id);
  };

  // Fashion House Palette: Black, White, Silver
  const styles = [
      { box: '#000000', ribbon: '#ffffff', border: '#333' }, // Classic Chanel-esque
      { box: '#ffffff', ribbon: '#000000', border: '#ddd' }, // Mono
      { box: '#1a1a1a', ribbon: '#d4d4d8', border: '#333' }, // Matte Black / Silver
  ];
  
  const styleIndex = Math.abs(id.charCodeAt(0)) % styles.length;
  const currentStyle = styles[styleIndex];

  return (
    <div
      onClick={handleClick}
      className={`absolute transition-all duration-1000 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer group`}
      style={{
        left: '50%',
        bottom: '40px', 
        transform: `translate(calc(-50% + ${x}px), ${-y}px) rotate(${rotation}deg) scale(${isOpen ? 1.1 : 1})`,
        zIndex: isOpen ? 100 : 30 + (y * -1),
      }}
    >
      <div className="relative w-20 h-16 drop-shadow-2xl">
        {/* Content - Glowing Diamond or item */}
        <div 
            className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 delay-100
                ${isOpen ? 'opacity-100 translate-y-[-50px] scale-110' : 'opacity-0 translate-y-0 scale-50'}`}
            style={{ zIndex: 0 }}
        >
            <div className={`p-3 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.8)] bg-black border border-white/20`}>
                <Icon size={28} color="white" strokeWidth={1.5} className={isOpen ? "animate-pulse" : ""} />
            </div>
        </div>

        {/* Box Body */}
        <div 
          className="absolute bottom-0 w-full h-12 rounded-sm shadow-lg overflow-hidden"
          style={{ backgroundColor: currentStyle.box, border: `1px solid ${currentStyle.border}` }}
        >
          {/* Subtle logo text placeholder */}
          <div className="absolute bottom-1 right-2 text-[4px] text-gray-500 uppercase tracking-widest opacity-50">Luxe</div>
          
          <div className="absolute left-1/2 -translate-x-1/2 w-4 h-full" style={{ backgroundColor: currentStyle.ribbon }}></div>
        </div>

        {/* Lid */}
        <div 
          className={`absolute top-0 w-[104%] -left-[2%] h-5 rounded-sm shadow-md transition-all duration-1000 origin-bottom-left z-10
            ${isOpen ? '-rotate-[110deg] translate-x-[-30px] translate-y-[20px] opacity-0' : 'rotate-0'}`}
          style={{ backgroundColor: currentStyle.box, border: `1px solid ${currentStyle.border}` }}
        >
           <div className="absolute left-1/2 -translate-x-1/2 w-4 h-full" style={{ backgroundColor: currentStyle.ribbon }}></div>
           
           {/* Crisp Flat Bow */}
           <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-4 filter drop-shadow-sm">
              <div className="absolute left-0 w-6 h-4 border-2" style={{ borderColor: currentStyle.ribbon, borderRadius: '40% 0 0 40%' }}></div>
              <div className="absolute right-0 w-6 h-4 border-2" style={{ borderColor: currentStyle.ribbon, borderRadius: '0 40% 40% 0' }}></div>
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2" style={{ backgroundColor: currentStyle.ribbon }}></div>
           </div>
        </div>
      </div>
    </div>
  );
};
