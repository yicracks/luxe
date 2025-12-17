import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- Types ---
type PartType = 'body' | 'doorL' | 'doorR' | 'rear' | 'wheel' | 'glass';

interface Point3D {
  id: number;
  x: number;
  y: number; // Y is up/down in our generation, but we might flip for rendering
  z: number;
  color: string;
  size: number;
  part: PartType;
  baseX: number;
  baseY: number;
  baseZ: number;
  flashSpeed: string;
  flashDelay: string;
}

// --- 3D Helpers ---
const rotateY = (x: number, y: number, z: number, angle: number) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - z * sin,
    y: y,
    z: x * sin + z * cos,
  };
};

// Rotate a point around a specific pivot (for doors/trunk)
const rotateAroundAxis = (x: number, y: number, z: number, axis: 'x'|'z', angle: number, pivot: {x:number, y:number, z:number}) => {
    // Translate to pivot
    let px = x - pivot.x;
    let py = y - pivot.y;
    let pz = z - pivot.z;

    // Rotate
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let nx = px, ny = py, nz = pz;

    if (axis === 'z') { // Rotate around Z axis (scissor door lifting sideways/up)
        // Usually scissor doors rotate around an axis that is roughly Z but tilted. 
        // For simplicity, we rotate around Z for the "upward" swing in side view.
        // Actually scissor doors rotate around X (lengthwise) or a complex pivot.
        // Let's do a simple rotation around Z (sideways lift) for visual clarity or X.
        // Let's try X axis rotation for "gullwing" or Z for "scissor". 
        // Real lambo doors hinge at the front.
        
        // Let's simulate a hinge at the front-bottom corner of the door.
        // Rotating around Z makes it swing out/up like a wing.
        // Rotating around X makes it flap.
        // Let's do a mix or just Z for the "Lambo" vertical lift.
        
        // Hinge is at Front of door (low Z).
        // To lift UP, we rotate around X? No, that's gullwing.
        // We want to rotate such that the back goes up.
        // Let's rotate around Z axis local to the hinge?
        
        // Actually, let's just rotate around the X axis (lengthwise) to open "out and up" (Butterfly)
        // Or strictly Z (Scissor). Let's stick to strict Scissor: rotate in the Y-Z plane? No, X-Y plane.
        // Rotation in X-Y plane is rotation around Z axis.
        nx = px * cos - py * sin;
        ny = px * sin + py * cos;
    } else if (axis === 'x') { // Trunk opening (pitch)
        ny = py * cos - pz * sin;
        nz = py * sin + pz * cos;
    }

    // Translate back
    return {
        x: nx + pivot.x,
        y: ny + pivot.y,
        z: nz + pivot.z
    };
}

export const DiamondCar: React.FC<{ isLightsOn: boolean }> = ({ isLightsOn }) => {
  const [angle, setAngle] = useState(Math.PI / 4); // Start at nice angle
  const [doorLOpen, setDoorLOpen] = useState(false);
  const [doorROpen, setDoorROpen] = useState(false);
  const [rearOpen, setRearOpen] = useState(false);
  
  const requestRef = useRef<number>(0);
  const angleRef = useRef(Math.PI / 4);

  // --- Animation Loop ---
  useEffect(() => {
    let lastTime = performance.now();
    const animate = (time: number) => {
        const delta = time - lastTime;
        lastTime = time;

        if (isLightsOn) {
            angleRef.current += 0.005; // Slow rotate
            setAngle(angleRef.current);
        }

        requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isLightsOn]);


  // --- Geometry Generation (Memoized) ---
  const points = useMemo(() => {
    const pts: Point3D[] = [];
    let idCounter = 0;

    const addPoint = (x: number, y: number, z: number, part: PartType, colorOverride?: string) => {
        // Colors: Pink gradients + White diamonds
        const pinks = ['#fbcfe8', '#f9a8d4', '#f472b6', '#db2777', '#be185d'];
        const isHighlight = Math.random() > 0.8;
        const color = colorOverride || (isHighlight ? '#ffffff' : pinks[Math.floor(Math.random() * pinks.length)]);
        
        pts.push({
            id: idCounter++,
            baseX: x,
            baseY: y,
            baseZ: z,
            x, y, z,
            part,
            color,
            size: Math.random() * 2 + 1.5,
            flashSpeed: Math.random() > 0.5 ? 'animate-twinkle' : 'animate-diamond-sparkle',
            flashDelay: `-${Math.random() * 5}s`
        });
    };

    // Helper to fill a quad surface with points
    const fillQuad = (
        p1: [number,number,number], 
        p2: [number,number,number], 
        p3: [number,number,number], 
        p4: [number,number,number], 
        density: number, 
        part: PartType,
        color?: string
    ) => {
        const stepsX = density;
        const stepsY = density;
        for(let i=0; i<=stepsX; i++) {
            for(let j=0; j<=stepsY; j++) {
                const u = i/stepsX;
                const v = j/stepsY;
                // Bilinear interpolation
                const x = (1-u)*(1-v)*p1[0] + u*(1-v)*p2[0] + u*v*p3[0] + (1-u)*v*p4[0];
                const y = (1-u)*(1-v)*p1[1] + u*(1-v)*p2[1] + u*v*p3[1] + (1-u)*v*p4[1];
                const z = (1-u)*(1-v)*p1[2] + u*(1-v)*p2[2] + u*v*p3[2] + (1-u)*v*p4[2];
                
                // Add jitter
                addPoint(x + (Math.random()-0.5), y + (Math.random()-0.5), z + (Math.random()-0.5), part, color);
            }
        }
    };

    // --- CAR DEFINITION ---
    // Coordinates: X (Width: -35 to 35), Y (Height: 0 to 45), Z (Length: -80 Front to 80 Rear)
    
    // 1. Chassis / Floor (Darker)
    fillQuad([-30, 5, -75], [30, 5, -75], [30, 5, 75], [-30, 5, 75], 15, 'body', '#831843');

    // 2. Nose / Hood
    // Bumper
    fillQuad([-32, 5, -80], [32, 5, -80], [30, 15, -70], [-30, 15, -70], 8, 'body');
    // Hood Top
    fillQuad([-30, 15, -70], [30, 15, -70], [32, 22, -20], [-32, 22, -20], 12, 'body');

    // 3. Windshield (Glass)
    fillQuad([-32, 22, -20], [32, 22, -20], [28, 38, 10], [-28, 38, 10], 10, 'glass', '#e0f2fe');

    // 4. Roof
    fillQuad([-28, 38, 10], [28, 38, 10], [28, 38, 30], [-28, 38, 30], 8, 'body');

    // 5. Rear Deck / Engine Cover (Opening Part)
    // Slopes down from roof back to rear
    const rearStart = 30;
    const rearEnd = 75;
    fillQuad([-28, 38, rearStart], [28, 38, rearStart], [30, 25, rearEnd], [-30, 25, rearEnd], 14, 'rear');
    // Rear bumper area
    fillQuad([-30, 25, rearEnd], [30, 25, rearEnd], [30, 10, 80], [-30, 10, 80], 8, 'body');

    // 6. Side Panels (Body fixed)
    // Lower skirt
    fillQuad([-32, 5, -60], [-32, 5, 60], [-35, 12, 60], [-35, 12, -60], 12, 'body'); // Left Lower
    fillQuad([32, 5, -60], [32, 5, 60], [35, 12, 60], [35, 12, -60], 12, 'body'); // Right Lower

    // 7. Doors (Opening Parts)
    // Left Door shape
    fillQuad(
        [-35, 12, -20], // Front Bottom
        [-35, 12, 30],  // Rear Bottom
        [-28, 38, 30],  // Rear Top
        [-32, 22, -20], // Front Top (near mirror)
        12, 'doorL'
    );
    // Left Window (on door)
    fillQuad([-32, 22, -15], [-28, 38, 15], [-28, 38, 25], [-35, 12, 25], 6, 'doorL', '#bfdbfe');


    // Right Door shape
    fillQuad(
        [35, 12, -20], 
        [35, 12, 30], 
        [28, 38, 30], 
        [32, 22, -20], 
        12, 'doorR'
    );
    // Right Window
    fillQuad([32, 22, -15], [28, 38, 15], [28, 38, 25], [35, 12, 25], 6, 'doorR', '#bfdbfe');

    // 8. Wheels (Approximated as dense circles)
    const addWheel = (cx:number, cz:number) => {
        for(let i=0; i<40; i++) {
            const theta = (i/40) * Math.PI * 2;
            const r = 11;
            // Outer rim
            addPoint(cx, 11 + r*Math.cos(theta), cz + r*Math.sin(theta), 'wheel', '#333');
            // Inner spokes
            if(i%4===0) addPoint(cx, 11 + r*0.5*Math.cos(theta), cz + r*0.5*Math.sin(theta), 'wheel', '#silver');
        }
    };
    addWheel(-34, -45); // Front L
    addWheel(34, -45);  // Front R
    addWheel(-34, 45);  // Rear L
    addWheel(34, 45);   // Rear R

    return pts;
  }, []); // Static geometry


  // --- Render Loop & Interactions ---

  // Handle click on a particle
  const handlePartClick = (part: PartType, e: React.MouseEvent) => {
      e.stopPropagation();
      if (part === 'doorL') setDoorLOpen(!doorLOpen);
      if (part === 'doorR') setDoorROpen(!doorROpen);
      if (part === 'rear') setRearOpen(!rearOpen);
  };

  const activePoints = useMemo(() => {
      // Process points for current frame (rotation + door state)
      return points.map(p => {
          let { x, y, z } = { x: p.baseX, y: p.baseY, z: p.baseZ };

          // 1. Apply Part Animations (Doors/Trunk) BEFORE global rotation
          // Left Door: Hinge at Front-Bottom-Left roughly (-35, 12, -20)
          if (p.part === 'doorL' && doorLOpen) {
              const pivot = { x: -35, y: 12, z: -20 };
              // Rotate 'up' (around Z axis implies movement in XY plane, 
              // effectively lifting the back of the door up)
              const rotated = rotateAroundAxis(x, y, z, 'z', -Math.PI / 3.5, pivot); 
              x = rotated.x; y = rotated.y; z = rotated.z;
          }

          // Right Door: Hinge at Front-Bottom-Right (35, 12, -20)
          if (p.part === 'doorR' && doorROpen) {
              const pivot = { x: 35, y: 12, z: -20 };
              const rotated = rotateAroundAxis(x, y, z, 'z', Math.PI / 3.5, pivot);
              x = rotated.x; y = rotated.y; z = rotated.z;
          }

          // Rear Trunk: Hinge at Top-Front of engine bay roughly (0, 38, 30)
          if (p.part === 'rear' && rearOpen) {
               const pivot = { x: 0, y: 38, z: 30 };
               // Rotate back/up around X axis
               const rotated = rotateAroundAxis(x, y, z, 'x', Math.PI / 4, pivot);
               x = rotated.x; y = rotated.y; z = rotated.z;
          }

          // 2. Global Rotation
          const rotatedGlobal = rotateY(x, y, z, angle);
          
          return { ...p, x: rotatedGlobal.x, y: rotatedGlobal.y, z: rotatedGlobal.z };
      }).sort((a, b) => b.z - a.z); // Painter's algo: Draw back first
  }, [points, angle, doorLOpen, doorROpen, rearOpen]);


  return (
    <div className="w-full h-full flex items-end justify-center pb-12 pointer-events-auto">
      <svg 
        viewBox="-200 -100 400 300" 
        className="w-[120%] h-[120%] overflow-visible drop-shadow-2xl"
        style={{ transform: 'translateY(20px)' }}
      >
        {/* Shadow */}
        <ellipse cx="0" cy="50" rx="140" ry="40" fill="black" opacity="0.5" filter="blur(10px)" />

        {activePoints.map(p => {
            // Perspective Projection
            // Camera at z = -400 approx
            const f = 400;
            const scale = f / (f + p.z); // +z goes into screen? No, usually -z is into screen.
            // Let's assume standard: +z is towards viewer, so we divide by (f - z). 
            // Here our range is -80 to 80.
            const scaleFactor = 350 / (350 - p.z);
            
            const px = p.x * scaleFactor;
            const py = -p.y * scaleFactor + 50; // Invert Y because SVG Y is down, offset to ground

            const opacity = Math.min(1, (p.z + 100) / 200) + 0.2; // Fade distance

            return (
                <circle 
                    key={p.id}
                    cx={px}
                    cy={py}
                    r={p.size * scaleFactor * (isLightsOn ? 1.2 : 1)}
                    fill={p.color}
                    opacity={opacity}
                    className={`cursor-pointer transition-all duration-300 ${isLightsOn ? p.flashSpeed : ''}`}
                    style={{ animationDelay: p.flashDelay }}
                    onClick={(e) => handlePartClick(p.part, e)}
                    stroke="transparent"
                    strokeWidth={10} // Invisible hit area for easier clicking
                />
            );
        })}
        
        {/* Helper Hint Text if static */}
        {!isLightsOn && (
            <text x="0" y="90" textAnchor="middle" fill="white" opacity="0.5" fontSize="10" className="font-serif tracking-widest">
                TAP DOORS TO OPEN
            </text>
        )}
      </svg>
    </div>
  );
};
