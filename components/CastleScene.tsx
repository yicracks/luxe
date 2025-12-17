import React, { useMemo, useEffect, useRef } from 'react';
import { playEngineSound } from '../utils/audioUtils';

// --- Types ---
interface Point3D {
  x: number;
  y: number;
  z: number;
  baseColor: string;
  part: 'body' | 'door_left' | 'door_right' | 'wheel' | 'light_front' | 'light_rear' | 'glass' | 'balloon' | 'string';
  nx: number;
  ny: number;
  nz: number;
  sparkleOffset: number; 
}

interface Particle {
    x: number; y: number; z: number;
    vx: number; vy: number; vz: number;
    life: number; maxLife: number;
    color: string;
    scale: number;
    type: 'exhaust'; 
}

interface Bounds {
    minX: number; maxX: number; minY: number; maxY: number;
}

export const CastleScene: React.FC<{ isLightsOn: boolean }> = ({ isLightsOn }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Animation State
    const angleRef = useRef(Math.PI / 4);
    const hoverYRef = useRef(0);
    const morphRef = useRef(0); // 0 = Roof, 1 = Balloon
    
    // Door State (Independent)
    const targetLeftDoor = useRef(0);
    const targetRightDoor = useRef(0);
    const valLeftDoor = useRef(0);
    const valRightDoor = useRef(0);

    const particlesRef = useRef<Particle[]>([]);
    const reqRef = useRef<number>(0);
    const timeRef = useRef(0);
    const wheelRotationRef = useRef(0);

    // Hit Testing Bounds (Screen Space)
    const boundsRef = useRef({
        leftDoor: { minX: 10000, maxX: -10000, minY: 10000, maxY: -10000 },
        rightDoor: { minX: 10000, maxX: -10000, minY: 10000, maxY: -10000 },
        car: { minX: 10000, maxX: -10000, minY: 10000, maxY: -10000 }
    });

    // --- Car Geometry Generator ---
    const carPoints = useMemo(() => {
        const points: Point3D[] = [];
        const add = (x: number, y: number, z: number, color: string, part: Point3D['part']) => {
            const j = 0.2; 
            points.push({
                x: x + (Math.random() - 0.5) * j,
                y: y + (Math.random() - 0.5) * j,
                z: z + (Math.random() - 0.5) * j,
                baseColor: color,
                part,
                nx: x, ny: y, nz: z,
                sparkleOffset: Math.random() * 100
            });
        };

        const LENGTH = 210; 
        const WIDTH = 90;
        const PINK_LIGHT = '#fbcfe8'; 
        const PINK_MID = '#f472b6';   
        const PINK_DARK = '#db2777';  
        const PINK_HOT = '#be185d';   
        const GLASS = '#334155'; 
        const step = 1.8; 

        // 1. MAIN BODY
        for (let x = -LENGTH/2; x <= LENGTH/2; x += step) {
            let w = WIDTH;
            let h = 26; 
            let yBase = 8;
            if (x > LENGTH * 0.1) {
                const ratio = (x - LENGTH*0.1) / (LENGTH*0.4);
                w = WIDTH * (1 - ratio * 0.35);
                h = 26 * (1 - ratio * 0.7);
            }
            const gradientRatio = (x + LENGTH/2) / LENGTH;
            const baseCol = gradientRatio > 0.6 ? PINK_LIGHT : (gradientRatio > 0.3 ? PINK_MID : PINK_DARK);
            const isDoorZone = x > -30 && x < 50;

            for (let z = -w/2; z <= w/2; z += step) {
                 const isSide = Math.abs(z) > w/2 - 2;
                 if (isDoorZone && Math.abs(z) > WIDTH * 0.25) continue; 
                 add(x, yBase + h, z, baseCol, 'body');
                 add(x, yBase, z, '#2a0a18', 'body'); 
            }
            if (!isDoorZone) {
                const zSide = w/2;
                for(let y = yBase; y <= yBase + h; y+=step) {
                    add(x, y, zSide, baseCol, 'body');
                    add(x, y, -zSide, baseCol, 'body');
                }
            }
            if (Math.abs(x - LENGTH/2) < step || Math.abs(x + LENGTH/2) < step) {
                for(let z = -w/2; z <= w/2; z += step) {
                     for(let y = yBase; y <= yBase + h; y+=step) {
                         add(x, y, z, baseCol, 'body');
                     }
                }
            }
        }

        // 2. CABIN (The Roof)
        for (let x = -40; x <= 40; x += step) {
             const curve = Math.cos((x / 45) * (Math.PI / 2)); 
             const roofH = 30 * curve;
             const roofW = (50 * curve) + 10; 
             const baseY = 34; 

             for (let z = -roofW/2; z <= roofW/2; z += step) {
                 const isFrame = Math.abs(z) > roofW/2 - 2 || x > 35; 
                 add(x, baseY + roofH, z, isFrame ? PINK_HOT : GLASS, 'glass');
             }
        }

        // 3. DOORS
        for (let side = -1; side <= 1; side += 2) {
            const zBase = (WIDTH/2) * side;
            const dLen = 80;
            const dStart = -30;
            for (let x = dStart; x <= dStart + dLen; x += step) {
                let h = 28;
                if (x > 20) h = 28 * (1 - (x-20)/50);
                const doorCol = x > 10 ? PINK_LIGHT : PINK_MID;
                for (let y = 8; y <= 8 + h; y += step) {
                    add(x, y, zBase, doorCol, side === 1 ? 'door_right' : 'door_left');
                    add(x, y, zBase - (3*side), '#4a0e26', side === 1 ? 'door_right' : 'door_left');
                }
                for (let t = 0; t <= 3; t+=step/2) {
                     add(x, 8+h, zBase - (t*side), doorCol, side === 1 ? 'door_right' : 'door_left');
                }
            }
        }

        // 4. WHEELS (Thick cylinders)
        const wheelZ = WIDTH/2 - 5;
        const wheelR = 18;
        const wheelY = 18; // Center Y
        [ [-65, wheelZ], [65, wheelZ], [-65, -wheelZ], [65, -wheelZ] ].forEach(([wx, wz]) => {
            for (let th = 0; th < Math.PI * 2; th += 0.2) {
                for (let w = -6; w <= 6; w += 2) {
                     add(wx + wheelR*Math.cos(th), wheelY + wheelR*Math.sin(th), wz + w, '#111', 'wheel');
                }
            }
            // Rim
            for (let r = 0; r < wheelR - 4; r += 2) {
                for (let th = 0; th < Math.PI * 2; th += 0.4) {
                     add(wx + r*Math.cos(th), wheelY + r*Math.sin(th), wz + (Math.sign(wz)*6), '#e2e8f0', 'wheel');
                }
            }
        });

        // 5. LIGHTS (Heart Shape)
        for (let zSide of [-30, 30]) {
             const cx = 100;
             const cy = 20;
             const cz = zSide;
             
             for (let t = 0; t < Math.PI * 2; t += 0.3) {
                 const scale = 0.3;
                 // Heart math
                 const hy = -(13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t)) * scale; 
                 const hz = (16 * Math.pow(Math.sin(t), 3)) * scale;

                 // Fill
                 add(cx, cy + hy, cz + hz, '#ffadd6', 'light_front');
                 add(cx - 1, cy + hy, cz + hz, '#ffebf4', 'light_front'); // Thickness
             }
        }

        // 6. BALLOON & STRING
        const bR = 30;
        const bCy = 130; // Float high above the car
        
        // Balloon Sphere
        for (let lat = -Math.PI/2; lat <= Math.PI/2; lat += 0.2) {
            for (let lon = 0; lon < Math.PI * 2; lon += 0.2) {
                const r = bR;
                const bx = r * Math.cos(lat) * Math.cos(lon);
                const bz = r * Math.cos(lat) * Math.sin(lon);
                const by = bCy + r * Math.sin(lat) * 1.1; 
                add(bx, by, bz, '#f472b6', 'balloon');
            }
        }
        // Balloon knot
        for(let y=bCy-bR-4; y<bCy-bR; y+=2) {
            add(0, y, 0, '#fff', 'balloon');
        }
        
        // String (From Car Body to Balloon Bottom)
        const carRoofY = 34;
        const balloonBottomY = bCy - bR;
        for(let y = carRoofY; y < balloonBottomY; y += 2) {
            add(0, y, 0, 'rgba(255,255,255,0.8)', 'string');
        }

        return points;
    }, []);

    // --- Interaction ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;

        const handleClick = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            // Scale input coordinates to match internal canvas resolution (800x700)
            const scaleX = 800 / rect.width;
            const scaleY = 700 / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            const margin = 20;
            const b = boundsRef.current;

            const inLeft = x >= b.leftDoor.minX - margin && x <= b.leftDoor.maxX + margin && y >= b.leftDoor.minY - margin && y <= b.leftDoor.maxY + margin;
            const inRight = x >= b.rightDoor.minX - margin && x <= b.rightDoor.maxX + margin && y >= b.rightDoor.minY - margin && y <= b.rightDoor.maxY + margin;
            
            if (inLeft || inRight) {
                 e.stopPropagation(); // Prevent bubbling if door is clicked
            }

            if (inLeft) {
                // Toggle left door
                if (!isLightsOn) targetLeftDoor.current = targetLeftDoor.current > 0.5 ? 0 : 1;
            } else if (inRight) {
                // Toggle right door
                if (!isLightsOn) targetRightDoor.current = targetRightDoor.current > 0.5 ? 0 : 1;
            } else {
                // General car hit test
                const inCar = x >= b.car.minX && x <= b.car.maxX && y >= b.car.minY && y <= b.car.maxY;
                if (inCar) {
                    playEngineSound();
                }
            }
        };

        canvas.addEventListener('click', handleClick);
        return () => canvas.removeEventListener('click', handleClick);
    }, [isLightsOn]); 

    // --- Render Loop ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 800 * dpr; 
        canvas.height = 700 * dpr;
        
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;
        
        ctx.scale(dpr, dpr);
        const centerX = 400;
        const centerY = 400;

        const render = () => {
            timeRef.current += 0.02;
            
            // Physics / Animation State
            const targetY = isLightsOn ? 140 : 0;
            hoverYRef.current += (targetY - hoverYRef.current) * 0.05;

            // Morph Logic: 0 = Car Roof, 1 = Balloon/String
            const targetMorph = isLightsOn ? 1 : 0;
            morphRef.current += (targetMorph - morphRef.current) * 0.05;
            const morph = morphRef.current;

            // Door Targets
            let tLeft = targetLeftDoor.current;
            let tRight = targetRightDoor.current;
            
            // FORCE CLOSE doors if lights are on (Balloon Mode)
            if (isLightsOn) {
                tLeft = 0; 
                tRight = 0;
            }

            valLeftDoor.current += (tLeft - valLeftDoor.current) * 0.1;
            valRightDoor.current += (tRight - valRightDoor.current) * 0.1;

            // Wheel Spin
            if (isLightsOn) {
                wheelRotationRef.current += 0.3; // Speed of spin
            } else {
                wheelRotationRef.current = 0;
            }

            angleRef.current += 0.005; 

            // Clear Canvas
            ctx.clearRect(0, 0, 800, 700);

            // Reset Bounds for this frame
            boundsRef.current = {
                leftDoor: { minX: 10000, maxX: -10000, minY: 10000, maxY: -10000 },
                rightDoor: { minX: 10000, maxX: -10000, minY: 10000, maxY: -10000 },
                car: { minX: 10000, maxX: -10000, minY: 10000, maxY: -10000 }
            };

            // --- PARTICLES GENERATION ---
            if (isLightsOn) {
                // Heart Exhaust
                if (Math.random() > 0.3) {
                    particlesRef.current.push({
                        type: 'exhaust',
                        x: -110, 
                        y: 30,
                        z: (Math.random() - 0.5) * 60,
                        vx: -6 - Math.random() * 5,
                        vy: (Math.random() - 0.5) * 2,
                        vz: (Math.random() - 0.5) * 3,
                        life: 1.0,
                        maxLife: 1.0,
                        color: Math.random() > 0.5 ? '#f472b6' : '#fbcfe8',
                        scale: 0.5 + Math.random() * 0.5
                    });
                }
            }

            const cos = Math.cos(angleRef.current);
            const sin = Math.sin(angleRef.current);

            // Update particles
            particlesRef.current.forEach(p => {
                p.x += p.vx; p.y += p.vy; p.z += p.vz; p.life -= 0.02;
            });
            particlesRef.current = particlesRef.current.filter(p => p.life > 0);

            const renderList: any[] = [];

            // 1. CAR POINTS
            for (let i = 0; i < carPoints.length; i++) {
                const p = carPoints[i];
                let px = p.nx, py = p.ny, pz = p.nz;

                // --- Morphing Logic ---
                let scaleMult = 1;
                
                if (p.part === 'glass') {
                    // Roof disappears as morph -> 1
                    scaleMult = 1 - morph;
                    if (scaleMult < 0.05) continue; 
                } else if (p.part === 'balloon' || p.part === 'string') {
                    // Balloon/String appear as morph -> 1
                    scaleMult = morph;
                    if (scaleMult < 0.05) continue;
                }

                // Apply Scale Morph towards geometric center of cabin area (approx 0, 50, 0)
                if (p.part === 'glass' || p.part === 'balloon' || p.part === 'string') {
                     const cx = 0, cy = 50, cz = 0;
                     px = cx + (px - cx) * scaleMult;
                     py = cy + (py - cy) * scaleMult;
                     pz = cz + (pz - cz) * scaleMult;
                }

                // String Animation (Wavy)
                if (p.part === 'string') {
                    // Sway slightly based on height
                    const hFactor = (py - 100) * 0.1;
                    px += Math.sin(timeRef.current * 2 + hFactor) * 2 * morph;
                }
                
                // Wheel Rotation Physics
                if (p.part === 'wheel') {
                    const cx = px > 0 ? 65 : -65;
                    const cy = 18; 
                    const rx = px - cx;
                    const ry = py - cy;
                    const wAng = -wheelRotationRef.current;
                    const rx2 = rx * Math.cos(wAng) - ry * Math.sin(wAng);
                    const ry2 = rx * Math.sin(wAng) + ry * Math.cos(wAng);
                    px = cx + rx2;
                    py = cy + ry2;
                }

                // Door Physics
                if (p.part === 'door_left' || p.part === 'door_right') {
                    const isRight = p.part === 'door_right';
                    const dir = isRight ? 1 : -1;
                    const openVal = isRight ? valRightDoor.current : valLeftDoor.current;
                    
                    // Scissor Door Geometry (Lamborghini Style):
                    // Pivot at Front (x=50), Bottom (y=20), Side (z=45)
                    const pivotX = 50;
                    const pivotY = 20;
                    const pivotZ = 45 * dir;
                    
                    let dx = px - pivotX;
                    let dy = py - pivotY;
                    let dz = pz - pivotZ;
                    
                    // Open Angle: Upward rotation around pivot
                    const baseAngle = openVal * 1.3; 
                    const totalAngle = -1 * baseAngle; // Negative = Lifts Rear Up

                    const cosA = Math.cos(totalAngle);
                    const sinA = Math.sin(totalAngle);
                    
                    const dx2 = dx * cosA - dy * sinA;
                    const dy2 = dx * sinA + dy * cosA;
                    
                    const flare = (openVal * 15) * dir; // Breathing flare

                    px = pivotX + dx2;
                    py = pivotY + dy2;
                    pz = pivotZ + dz + flare;
                }

                if (isLightsOn) py += Math.sin(timeRef.current * 3) * 3; // Bob

                // Transform to World
                const wx = px * cos - pz * sin;
                const wz = px * sin + pz * cos;
                const wy = py + hoverYRef.current;

                // Screen Project
                const depth = 1000 - wz;
                if (depth > 10) {
                    const scale = 1000 / depth;
                    const screenX = centerX + wx * scale;
                    const screenY = centerY - wy * scale + 80;

                    // Hit Test Update
                    if (p.part === 'door_left') {
                        const b = boundsRef.current.leftDoor;
                        b.minX = Math.min(b.minX, screenX); b.maxX = Math.max(b.maxX, screenX);
                        b.minY = Math.min(b.minY, screenY); b.maxY = Math.max(b.maxY, screenY);
                    } else if (p.part === 'door_right') {
                        const b = boundsRef.current.rightDoor;
                        b.minX = Math.min(b.minX, screenX); b.maxX = Math.max(b.maxX, screenX);
                        b.minY = Math.min(b.minY, screenY); b.maxY = Math.max(b.maxY, screenY);
                    }
                    // General Car
                    const b = boundsRef.current.car;
                    b.minX = Math.min(b.minX, screenX); b.maxX = Math.max(b.maxX, screenX);
                    b.minY = Math.min(b.minY, screenY); b.maxY = Math.max(b.maxY, screenY);
                }

                renderList.push({
                    type: 'point',
                    x: wx, y: wy, z: wz,
                    color: p.baseColor,
                    sparkle: p.sparkleOffset,
                    part: p.part
                });
            }

            // 2. PARTICLES
            for (const p of particlesRef.current) {
                const wx = p.x * cos - p.z * sin;
                const wz = p.x * sin + p.z * cos;
                const wy = p.y + hoverYRef.current; 

                renderList.push({
                    type: 'heart',
                    x: wx, y: wy, z: wz,
                    color: p.color,
                    life: p.life,
                    scale: p.scale
                });
            }

            // 3. SORT
            renderList.sort((a, b) => a.z - b.z);

            // 4. DRAW SCENE
            for(const item of renderList) {
                const depth = 1000 - item.z;
                if (depth < 10) continue;
                const scale = 1000 / depth;
                const screenX = centerX + item.x * scale;
                const screenY = centerY - item.y * scale + 80;

                if (item.type === 'heart') {
                    const s = 10 * scale * item.scale;
                    ctx.globalAlpha = item.life * 0.8;
                    ctx.fillStyle = item.color;
                    ctx.beginPath();
                    const topCurveHeight = s * 0.3;
                    ctx.moveTo(screenX, screenY + topCurveHeight);
                    ctx.bezierCurveTo(screenX - s / 2, screenY - s / 2, screenX - s, screenY + s / 3, screenX, screenY + s);
                    ctx.bezierCurveTo(screenX + s, screenY + s / 3, screenX + s / 2, screenY - s / 2, screenX, screenY + topCurveHeight);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                } 
                else {
                    const size = (item.part.includes('light')) ? 4 * scale : (item.part === 'string' ? 1.5 * scale : 2.5 * scale);
                    let color = item.color;
                    
                    const sparkleVal = Math.sin(timeRef.current * 2.5 + item.sparkle);
                    const viewFlash = Math.sin(angleRef.current * 5 + item.x * 0.1);
                    if (sparkleVal > 0.95 && viewFlash > 0 && item.part !== 'string') {
                        color = '#ffffff';
                        ctx.shadowBlur = 5;
                        ctx.shadowColor = 'white';
                    } else {
                        ctx.shadowBlur = 0;
                    }

                    ctx.fillStyle = color;
                    ctx.fillRect(screenX - size/2, screenY - size/2, size, size);
                }
            }
            
            reqRef.current = requestAnimationFrame(render);
        };

        reqRef.current = requestAnimationFrame(render);
        return () => cancelAnimationFrame(reqRef.current);
    }, [isLightsOn, carPoints]);

    return (
        <canvas 
            ref={canvasRef} 
            className="w-full h-full block cursor-pointer pointer-events-auto"
        />
    );
}
