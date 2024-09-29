import React, { useEffect, useRef } from 'react';

/**
 * Fluid Meter Component
 * by Angel Arcoraci
 * https://github.com/aarcoraci
 * 
 * MIT License
 */

// Define types for options and bubble layer
interface FluidMeterOptions {
  drawShadow?: boolean;
  drawText?: boolean;
  drawPercentageSign?: boolean;
  drawBubbles?: boolean;
  fontSize?: string;
  fontFamily?: string;
  fontFillStyle?: string;
  size?: number;
  borderWidth?: number;
  backgroundColor?: string;  // Optional
  foregroundColor?: string;  // Optional
  bubbleStrokeColor?: string;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  velX: number;
  velY: number;
}

// Define the props for the FluidMeter component
interface FluidMeterProps {
  // fillPercentage: number;
  filled: number;
  max:number;
  options?: FluidMeterOptions;
}

const FluidMeter: React.FC<FluidMeterProps> = ({ filled, max, options }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let context: CanvasRenderingContext2D;
  let time: number | null = null;
  let dt: number | null = null;

  const defaultOptions: FluidMeterOptions = {
    drawShadow: true,
    drawText: true,
    drawPercentageSign: true,
    drawBubbles: true,
    fontSize: '20px',
    fontFamily: 'Arial',
    fontFillStyle: 'green',
    size: 200,
    borderWidth: 4,
    backgroundColor: '#e2e2e2',  // Default background color
    foregroundColor: '#fafafa',  // Default foreground color
    bubbleStrokeColor: 'rgba(255, 255, 255, 0.8)', 
    ...options // Merge with any passed options
  };

  let currentFillPercentage = 0;
   // Compute filled percentage
   const computeFillPercentage = () => {
    const percent = (filled / max) * 100; // Convert to percentage
    return Math.max(0, Math.min(percent, 100)); // Clamp between 0 and 100
  };


  const percent = computeFillPercentage();
  const fill = Math.max(0, Math.min( percent, 100));

  const foregroundFluidLayer = {
    fillStyle: '#ffd24a',
    angle: 0,
    horizontalPosition: 0,
    angularSpeed: 10,
    maxAmplitude: 3,
    frequency: 30,
    horizontalSpeed: -150,
    initialHeight: 0,
  };

  const backgroundFluidLayer = {
    fillStyle: 'lightyellow',
    angle: 0,
    horizontalPosition: 0,
    angularSpeed: 140,
    maxAmplitude: 6,
    frequency: 40,
    horizontalSpeed: 150,
    initialHeight: 0,
  };

  const bubblesLayer = {
    bubbles: [] as Bubble[],
    amount: 12,
    speed: 20,
    current: 0,
    swing: 0,
    size: 3,
    reset(bubble: Bubble) {
      const meterBottom = (defaultOptions.size! - (defaultOptions.size! - getMeterRadius()) / 2) - defaultOptions.borderWidth!;
      const fluidAmount = currentFillPercentage * (getMeterRadius() - defaultOptions.borderWidth! * 2) / 100;
      bubble.r = random(this.size, this.size * 2) / 2;
      bubble.x = random(0, defaultOptions.size!);
      bubble.y = random(meterBottom, meterBottom - fluidAmount);
      bubble.velX = 0;
      bubble.velY = random(this.speed, this.speed * 2);
    },
    init() {
      for (let i = 0; i < this.amount; i++) {
        const bubble = {
          x: random(0, defaultOptions.size!),
          y: random(defaultOptions.size!, defaultOptions.size! - 10), // Start bubbles above the bottom
          r: random(this.size, this.size * 2) / 2,
          velX: 0,
          velY: random(this.speed, this.speed * 2),
        };
        this.bubbles.push(bubble);
      }
    },
  };
  
  const drawBubblesLayer = (dt: number) => {
    context.save();
    context.strokeStyle = defaultOptions.bubbleStrokeColor!; // Color for bubbles
    context.lineWidth = 1; // Set the stroke width for the rings
    for (const bubble of bubblesLayer.bubbles) {
      bubble.y -= bubble.velY * dt; // Move the bubble up
      if (bubble.y < 0) {
        bubblesLayer.reset(bubble); // Reset bubble if it goes above canvas
      }
  
      // Draw the ring (outline) for the bubble
      context.beginPath();
      context.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
      context.stroke();
      context.closePath();
    }
    context.restore();
  };
  

  useEffect(() => {
    if (canvasRef.current) {
      context = canvasRef.current.getContext('2d')!;
      context.imageSmoothingEnabled = true; // Set on context
      setupCanvas();
      bubblesLayer.init();
      draw();
    }
  }, []);

  useEffect(() => {
    currentFillPercentage = computeFillPercentage(); // Update on prop change
  }, [filled, max]);

  const setupCanvas = () => {
    const canvas = canvasRef.current!;
    canvas.width = defaultOptions.size!;
    canvas.height = defaultOptions.size!;

    if (defaultOptions.drawShadow) {
      context.save();
      context.beginPath();
      context.filter = 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))';
      context.arc(defaultOptions.size! / 2, defaultOptions.size! / 2, getMeterRadius() / 2, 0, 2 * Math.PI);
      context.closePath();
      context.fill();
      context.restore();
    }
  };

  const draw = () => {
    const now = new Date().getTime();
    dt = (now - (time || now)) / 1000;
    time = now;

    requestAnimationFrame(draw);
    context.clearRect(0, 0, defaultOptions.size!, defaultOptions.size!);
    
    // Update current fill percentage based on filled and max props
    currentFillPercentage = computeFillPercentage();
    
    drawMeterBackground();
    drawFluid(dt!);
    if (defaultOptions.drawText) {
      drawText();
    }
    drawMeterForeground();
  };

  const drawMeterBackground = () => {
    context.save();
    context.fillStyle = defaultOptions.backgroundColor!; // Ensure value is defined
    context.beginPath();
    context.arc(defaultOptions.size! / 2, defaultOptions.size! / 2, getMeterRadius() / 2 - defaultOptions.borderWidth!, 0, 2 * Math.PI);
    context.closePath();
    context.fill();
    context.restore();
  };

  const drawMeterForeground = () => {
    context.save();
    context.lineWidth = defaultOptions.borderWidth!;
    context.strokeStyle = defaultOptions.foregroundColor!; // Ensure value is defined
    context.beginPath();
    context.arc(defaultOptions.size! / 2, defaultOptions.size! / 2, getMeterRadius() / 2 - defaultOptions.borderWidth! / 2, 0, 2 * Math.PI);
    context.closePath();
    context.stroke();
    context.restore();
  };

  const drawFluid = (dt: number) => {
    context.save();
    context.arc(defaultOptions.size! / 2, defaultOptions.size! / 2, getMeterRadius() / 2 - defaultOptions.borderWidth!, 0, Math.PI * 2);
    context.clip();
    drawFluidLayer(backgroundFluidLayer, dt);
    drawFluidLayer(foregroundFluidLayer, dt);
    if (defaultOptions.drawBubbles) {
      drawFluidMask(foregroundFluidLayer); // Call with a single argument
      drawBubblesLayer(dt);
    }
    context.restore();
  };

  const drawFluidLayer = (layer: any, dt: number) => {
    if (layer.angularSpeed > 0) {
      layer.angle += layer.angularSpeed * dt;
      layer.angle = layer.angle < 0 ? layer.angle + 360 : layer.angle;
    }

    layer.horizontalPosition += layer.horizontalSpeed * dt;

    const meterBottom = (defaultOptions.size! - (defaultOptions.size! - getMeterRadius()) / 2) - defaultOptions.borderWidth!;
    const fluidAmount = currentFillPercentage * (getMeterRadius() - defaultOptions.borderWidth! * 2) / 100;

    if (currentFillPercentage < fill) {
      currentFillPercentage += 15 * dt;
    } else if (currentFillPercentage > fill) {
      currentFillPercentage -= 15 * dt;
    }

    layer.initialHeight = meterBottom - fluidAmount;

    context.save();
    context.beginPath();
    context.lineTo(0, layer.initialHeight);

    let x = 0;
    let y = 0;
    const amplitude = layer.maxAmplitude * Math.sin(layer.angle * Math.PI / 180);

    while (x < defaultOptions.size!) {
      y = layer.initialHeight + amplitude * Math.sin((x + layer.horizontalPosition) / layer.frequency);
      context.lineTo(x, y);
      x++;
    }

    context.lineTo(x, defaultOptions.size!);
    context.lineTo(0, defaultOptions.size!);
    context.closePath();

    context.fillStyle = layer.fillStyle;
    context.fill();
    context.restore();
  };

  const drawFluidMask = (layer: any) => { // Only one parameter here
    let x = 0;
    let y = 0;
    const amplitude = layer.maxAmplitude * Math.sin(layer.angle * Math.PI / 180);

    context.beginPath();
    context.lineTo(0, layer.initialHeight);

    while (x < defaultOptions.size!) {
      y = layer.initialHeight + amplitude * Math.sin((x + layer.horizontalPosition) / layer.frequency);
      context.lineTo(x, y);
      x++;
    }
    context.lineTo(x, defaultOptions.size!);
    context.lineTo(0, defaultOptions.size!);
    context.closePath();
    context.clip();
  };

  

  const drawText = () => {
    // Prepare the text for each line
    const percentageText = `${Math.round(fill)}${defaultOptions.drawPercentageSign ? '%' : ''}`;
    const filledText = `Filled: ${filled}`;
    const emptyText = `Empty: ${max - filled}`;
  
    // Set up the font and style
    context.save();
    context.fillStyle = defaultOptions.fontFillStyle!;
    context.font = `${defaultOptions.fontSize!} ${defaultOptions.fontFamily!}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
  
    // Draw each line of text by adjusting the y-coordinate
    const textX = defaultOptions.size! / 2;
    let textY = defaultOptions.size! / 2 - 20; // Start a little higher for the first line
  
    // Draw percentage text (first line)
    context.fillText(percentageText, textX, textY);
  
    // Draw filled text (second line)
    textY += 30; // Move down for the next line
    context.fillText(filledText, textX, textY);
  
    // Draw empty text (third line)
    textY += 30; // Move down again for the next line
    context.fillText(emptyText, textX, textY);
  
    context.restore();
  };

  const getMeterRadius = (): number => {
    return defaultOptions.size! - defaultOptions.borderWidth! * 2;
  };

  const random = (min: number, max: number): number => Math.floor(Math.random() * (max - min) + min);

  return (
    <canvas ref={canvasRef}></canvas>
  );
};

export default FluidMeter;
