import React, { useMemo, useState, useEffect, useRef } from 'react';

// Helper for 3D rotation
const rotateY = (x: number, y: number, z: number, angle: number) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotX = x * cos - z * sin;
  const rotZ = x * sin + z * cos;
  return { x: rotX, y, z: rotZ };
};

// --- Main Rotating Tree Container ---
// Manages the animation loop and rendering order of all 3D parts
export const RotatingTree: React.FC<{ 
    height: number; 
    width: number; 
    isGolden: boolean; 
    onInteract: () => void; 
}> = ({ height, width, isGolden, onInteract }) => {
    
    // Animation State
    const [angle, setAngle] = useState(0);
    const requestRef = useRef<number>(0);
    
    // Physics State for Inertia
    const velocityRef = useRef(0);
    const isGoldenRef = useRef(isGolden);

    // Keep ref in sync with prop to use inside animation loop
    useEffect(() => {
        isGoldenRef.current = isGolden;
    }, [isGolden]);

    const animate = () => {
        const targetSpeed = isGoldenRef.current ? 0.02 : 0;
        const currentSpeed = velocityRef.current;
        let newSpeed = currentSpeed;

        if (isGoldenRef.current) {
             // Accelerate smoothly to target
             newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.05;
        } else {
             // Decelerate slowly (inertia)
             newSpeed = currentSpeed * 0.98;
             if (newSpeed < 0.0001) newSpeed = 0;
        }
        
        velocityRef.current = newSpeed;

        // Update angle if moving
        if (newSpeed > 0.00001) {
             setAngle(prev => (prev + newSpeed) % (Math.PI * 2));
        }

        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    // --- Data Generation (Memoized) ---
    
    // 1. Diamond/Gold Dust Particles
    const particles = useMemo(() => {
        return Array.from({ length: 350 }).map((_, i) => {
            const y = Math.pow(Math.random(), 0.8) * height; 
            const maxW = (y / height) * width * 0.9;
            const theta = Math.random() * Math.PI * 2;
            const r = Math.random() * maxW * 0.5; // Distribute inside cone
            return {
                id: i,
                baseX: r * Math.cos(theta),
                y: y,
                baseZ: r * Math.sin(theta),
                size: Math.random() * 3 + 1,
                type: Math.random() > 0.8 ? 'diamond' : 'dot',
                // Pre-calculate animation offset so they don't all twinkle in sync
                animDelay: Math.random() * 5,
                // Assign different sparkle speeds
                animSpeed: Math.random() > 0.6 ? 'animate-diamond-flash' : 'animate-diamond-sparkle'
            };
        });
    }, [height, width]);

    // 2. Pearl Spirals
    const pearls = useMemo(() => {
        const points = [];
        const loops = 7;
        const stepsPerLoop = 35;
        for (let i = 0; i < loops * stepsPerLoop; i++) {
            const progress = i / (loops * stepsPerLoop);
            const y = progress * height;
            const r = (y / height) * (width / 2);
            const theta = progress * Math.PI * 2 * loops;
            points.push({
                id: `p-${i}`,
                baseX: r * Math.cos(theta),
                y: y,
                baseZ: r * Math.sin(theta),
            });
        }
        return points;
    }, [height, width]);

    // 3. Crystals / Ornaments
    const crystals = useMemo(() => {
        const definitions = [
            { y: 150, theta: 0 }, { y: 150, theta: 2.1 }, { y: 150, theta: 4.2 },
            { y: 240, theta: 1 }, { y: 240, theta: 3.1 }, { y: 240, theta: 5.2 },
            { y: 320, theta: 0.5 }, { y: 320, theta: 2.6 }, { y: 320, theta: 4.7 },
            { y: 400, theta: 1.5 }, { y: 400, theta: 3.6 }, { y: 400, theta: 5.7 },
            { y: 480, theta: 0.2 }, { y: 480, theta: 2.3 }, { y: 480, theta: 4.4 },
        ];
        return definitions.map((def, i) => {
            const r = (def.y / height) * (width / 2) * 1.1; // Slightly outside
            return {
                id: `c-${i}`,
                baseX: r * Math.cos(def.theta),
                y: def.y,
                baseZ: r * Math.sin(def.theta),
            };
        });
    }, [height, width]);


    // --- Rendering Helpers ---

    // Render Particle
    const renderParticle = (p: typeof particles[0]) => {
        const { x, z } = rotateY(p.baseX, p.y, p.baseZ, angle);
        const scale = 1000 / (1000 - z); // Simple perspective
        const alpha = (z + 200) / 400; // Fade out back
        
        if (alpha < 0.1) return null;

        // Diamond White / Silver hue
        const color = isGolden 
            ? (Math.random() > 0.8 ? '#fef3c7' : '#e0f2fe') // Occasional gold glint, mostly diamond blue-white
            : (Math.random() > 0.8 ? '#e0f2fe' : '#ffffff');
        
        // Intense flashing when lights are on
        const animationClass = isGolden 
            ? p.animSpeed // diamond-flash or diamond-sparkle
            : 'animate-twinkle';

        return (
            <g key={p.id} transform={`translate(${x}, ${p.y}) scale(${scale})`}>
                {p.type === 'diamond' ? (
                     <rect 
                        width={p.size} height={p.size} 
                        fill={color} 
                        className={animationClass}
                        style={{ animationDelay: `-${p.animDelay}s` }}
                        transform="rotate(45)"
                        opacity={Math.min(1, alpha)}
                     />
                ) : (
                     <circle r={p.size/2} fill={color} opacity={Math.min(1, alpha)} />
                )}
            </g>
        );
    };

    // Render Pearl
    const renderPearl = (p: typeof pearls[0]) => {
        const { x, z } = rotateY(p.baseX, p.y, p.baseZ, angle);
        if (z < -50) return null;

        const scale = 1000 / (1000 - z);
        const isFront = z > 0;
        const color = isGolden 
             ? (isFront ? '#f8fafc' : '#94a3b8') // Cool silver/white even when on
             : (isFront ? '#ffffff' : '#94a3b8');
        const size = (isFront ? (3 + (p.y/height)*3) : (2 + (p.y/height)*2)) * scale;

        return (
            <circle 
                key={p.id}
                cx={x} cy={p.y} r={size}
                fill={color}
                opacity={isFront ? 1 : 0.6}
            />
        );
    };

    const getZ = (baseX: number, baseZ: number) => {
        return baseX * Math.sin(angle) + baseZ * Math.cos(angle);
    };

    return (
        <g>
            {/* Trunk: High Transparency, White-Silver, Thin */}
            <defs>
                 {/* Glass Trunk Gradient - White/Silver */}
                 <linearGradient id="trunkGlass" x1="0" y1="0" x2="1" y2="0">
                     <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.1" /> 
                     <stop offset="30%" stopColor="#ffffff" stopOpacity="0.4" /> 
                     <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" /> 
                     <stop offset="70%" stopColor="#ffffff" stopOpacity="0.4" /> 
                     <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.1" />
                 </linearGradient>
            </defs>
            
            {/* Main Trunk Body - Thinned down to width 10 (from 24) */}
            <rect 
                x={-5} 
                y={height - 25} 
                width={10} 
                height={60} 
                rx={1}
                fill="url(#trunkGlass)"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="0.5"
                style={{ backdropFilter: 'blur(2px)' }} 
            />
            
            {/* Internal "Refraction" lines - Closer together for thin trunk */}
             <line x1={-2} y1={height - 25} x2={-2} y2={height + 35} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
             <line x1={2} y1={height - 25} x2={2} y2={height + 35} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />

            {/* 1. Core Gradient Volume */}
            <path 
                d={`M 0,0 L ${width/2},${height} L -${width/2},${height} Z`} 
                fill="url(#coreGradient)" 
                opacity={isGolden ? "0.6" : "0.3"} 
                style={{ filter: 'blur(20px)', transition: 'fill 1s' }}
            />
            <defs>
                <linearGradient id="coreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isGolden ? "#fef3c7" : "#fff"} stopOpacity="0.8"/>
                    <stop offset="100%" stopColor={isGolden ? "#d97706" : "#94a3b8"} stopOpacity="0.1"/>
                </linearGradient>
            </defs>

            {/* 2. Particles */}
            {particles.map(renderParticle)}

            {/* 3. Pearls & Crystals */}
            {[...pearls.map(p => ({...p, type: 'pearl'})), ...crystals.map(c => ({...c, type: 'crystal'}))]
                .map(item => ({ ...item, z: getZ(item.baseX, item.baseZ) }))
                .sort((a, b) => a.z - b.z) 
                .map((item) => {
                    if (item.type === 'pearl') return renderPearl(item as any);
                    
                    const c = item as any;
                    const { x, z } = rotateY(c.baseX, c.y, c.baseZ, angle);
                    const scale = 1000 / (1000 - z);
                    const opacity = (z + 200) / 400;
                    
                    return (
                        <g key={item.id} transform={`translate(${x}, ${c.y}) scale(${scale})`} style={{ opacity: Math.max(0.2, Math.min(1, opacity)), pointerEvents: z > 0 ? 'auto' : 'none' }}>
                            <CrystalOrn isGolden={isGolden} onClick={onInteract} />
                        </g>
                    );
                })
            }
        </g>
    );
};


// --- 4-Point Star ---
export const Star: React.FC<{ isGolden: boolean }> = ({ isGolden }) => (
  <g className="animate-pulse-slow" style={{ transformOrigin: 'center' }}>
    <defs>
      <filter id="starFlare">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    <circle r="18" fill={isGolden ? "#fcd34d" : "white"} filter="blur(8px)" opacity="0.8" style={{transition: 'fill 1s'}} />
    
    <g filter="url(#starFlare)">
        <path d="M 0,-45 Q 2,-10 35,0 Q 2,10 0,45 Q -2,10 -35,0 Q -2,-10 0,-45" fill={isGolden ? "#fffbeb" : "white"} style={{transition: 'fill 1s'}} />
    </g>
    
    <g transform="rotate(45) scale(0.6)">
        <path d="M 0,-45 Q 2,-10 35,0 Q 2,10 0,45 Q -2,10 -35,0 Q -2,-10 0,-45" fill={isGolden ? "#fcd34d" : "white"} opacity="0.8" style={{transition: 'fill 1s'}}/>
    </g>
  </g>
);

export const CrystalOrn: React.FC<{ isGolden: boolean; onClick?: () => void }> = ({ isGolden, onClick }) => {
    const [active, setActive] = React.useState(false);
    
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActive(true);
        if(onClick) onClick();
        setTimeout(() => setActive(false), 500); 
    };

    return (
        <g 
            onClick={handleClick}
            className={`cursor-pointer ${active ? "animate-shake origin-top" : ""}`}
            style={{ transformBox: 'fill-box' }}
        >
             <line x1="0" y1="-8" x2="0" y2="-20" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />

             <g>
                <path 
                    d="M 0,-10 L 8,0 L 0,10 L -8,0 Z" 
                    fill={isGolden ? "url(#crystalGradGold)" : "url(#crystalGrad)"} 
                    stroke="white" 
                    strokeWidth="0.5"
                    filter="drop-shadow(0 0 5px rgba(255,255,255,0.5))"
                    style={{ transition: 'fill 1s' }}
                />
                <path d="M 0,-10 L 0,10 M -8,0 L 8,0" stroke={isGolden ? "rgba(180, 83, 9, 0.5)" : "rgba(255,255,255,0.3)"} strokeWidth="0.5" />
             </g>

             <defs>
                 <linearGradient id="crystalGrad" x1="0" y1="0" x2="1" y2="1">
                     <stop offset="0%" stopColor="#fff" />
                     <stop offset="50%" stopColor="#e2e8f0" />
                     <stop offset="100%" stopColor="#94a3b8" />
                 </linearGradient>
                 <linearGradient id="crystalGradGold" x1="0" y1="0" x2="1" y2="1">
                     <stop offset="0%" stopColor="#fff" />
                     <stop offset="50%" stopColor="#fcd34d" />
                     <stop offset="100%" stopColor="#b45309" />
                 </linearGradient>
             </defs>
        </g>
    )
}