import React, { useEffect, useRef } from 'react';

/**
 * Fluid Meter Component
 * by Angel Arcoraci
 * https://github.com/aarcoraci
 * 
 * MIT License
 */
const FluidMeter = ({ fillPercentage, options }) => {
  const canvasRef = useRef(null);
  let context;
  let time = null;
  let dt = null;

  const defaultOptions = {
    drawShadow: true,
    drawText: true,
    drawPercentageSign: true,
    drawBubbles: true,
    fontSize: '70px',
    fontFamily: 'Arial',
    fontFillStyle: 'white',
    size: 300,
    borderWidth: 25,
    backgroundColor: '#e2e2e2',
    foregroundColor: '#fafafa',
    ...options // Merge with any passed options
  };

  let currentFillPercentage = 0;
  const fill = Math.max(0, Math.min(fillPercentage, 100));

  const foregroundFluidLayer = {
    fillStyle: 'purple',
    angle: 0,
    horizontalPosition: 0,
    angularSpeed: 0,
    maxAmplitude: 9,
    frequency: 30,
    horizontalSpeed: -150,
    initialHeight: 0
  };

  const backgroundFluidLayer = {
    fillStyle: 'pink',
    angle: 0,
    horizontalPosition: 0,
    angularSpeed: 140,
    maxAmplitude: 12,
    frequency: 40,
    horizontalSpeed: 150,
    initialHeight: 0
  };

  const bubblesLayer = {
    bubbles: [],
    amount: 12,
    speed: 20,
    current: 0,
    swing: 0,
    size: 2,
    reset(bubble) {
      const meterBottom = (defaultOptions.size - (defaultOptions.size - getMeterRadius()) / 2) - defaultOptions.borderWidth;
      const fluidAmount = currentFillPercentage * (getMeterRadius() - defaultOptions.borderWidth * 2) / 100;
      bubble.r = random(this.size, this.size * 2) / 2;
      bubble.x = random(0, defaultOptions.size);
      bubble.y = random(meterBottom, meterBottom - fluidAmount);
      bubble.velX = 0;
      bubble.velY = random(this.speed, this.speed * 2);
      bubble.swing = random(0, 2 * Math.PI);
    },
    init() {
      for (let i = 0; i < this.amount; i++) {
        const meterBottom = (defaultOptions.size - (defaultOptions.size - getMeterRadius()) / 2) - defaultOptions.borderWidth;
        const fluidAmount = currentFillPercentage * (getMeterRadius() - defaultOptions.borderWidth * 2) / 100;
        this.bubbles.push({
          x: random(0, defaultOptions.size),
          y: random(meterBottom, meterBottom - fluidAmount),
          r: random(this.size, this.size * 2) / 2,
          velX: 0,
          velY: random(this.speed, this.speed * 2)
        });
      }
    }
  };

  useEffect(() => {
    context = canvasRef.current.getContext('2d');
    setupCanvas();
    bubblesLayer.init();
    draw();
  }, []);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    canvas.width = defaultOptions.size;
    canvas.height = defaultOptions.size;
    canvas.imageSmoothingEnabled = true;

    if (defaultOptions.drawShadow) {
      context.save();
      context.beginPath();
      context.filter = 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))';
      context.arc(defaultOptions.size / 2, defaultOptions.size / 2, getMeterRadius() / 2, 0, 2 * Math.PI);
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
    context.clearRect(0, 0, defaultOptions.size, defaultOptions.size);
    drawMeterBackground();
    drawFluid(dt);
    if (defaultOptions.drawText) {
      drawText();
    }
    drawMeterForeground();
  };

  const drawMeterBackground = () => {
    context.save();
    context.fillStyle = defaultOptions.backgroundColor;
    context.beginPath();
    context.arc(defaultOptions.size / 2, defaultOptions.size / 2, getMeterRadius() / 2 - defaultOptions.borderWidth, 0, 2 * Math.PI);
    context.closePath();
    context.fill();
    context.restore();
  };

  const drawMeterForeground = () => {
    context.save();
    context.lineWidth = defaultOptions.borderWidth;
    context.strokeStyle = defaultOptions.foregroundColor;
    context.beginPath();
    context.arc(defaultOptions.size / 2, defaultOptions.size / 2, getMeterRadius() / 2 - defaultOptions.borderWidth / 2, 0, 2 * Math.PI);
    context.closePath();
    context.stroke();
    context.restore();
  };

  const drawFluid = (dt) => {
    context.save();
    context.arc(defaultOptions.size / 2, defaultOptions.size / 2, getMeterRadius() / 2 - defaultOptions.borderWidth, 0, Math.PI * 2);
    context.clip();
    drawFluidLayer(backgroundFluidLayer, dt);
    drawFluidLayer(foregroundFluidLayer, dt);
    if (defaultOptions.drawBubbles) {
      drawFluidMask(foregroundFluidLayer, dt);
      drawBubblesLayer(dt);
    }
    context.restore();
  };

  const drawFluidLayer = (layer, dt) => {
    if (layer.angularSpeed > 0) {
      layer.angle += layer.angularSpeed * dt;
      layer.angle = layer.angle < 0 ? layer.angle + 360 : layer.angle;
    }

    layer.horizontalPosition += layer.horizontalSpeed * dt;

    const meterBottom = (defaultOptions.size - (defaultOptions.size - getMeterRadius()) / 2) - defaultOptions.borderWidth;
    const fluidAmount = currentFillPercentage * (getMeterRadius() - defaultOptions.borderWidth * 2) / 100;

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

    while (x < defaultOptions.size) {
      y = layer.initialHeight + amplitude * Math.sin((x + layer.horizontalPosition) / layer.frequency);
      context.lineTo(x, y);
      x++;
    }

    context.lineTo(x, defaultOptions.size);
    context.lineTo(0, defaultOptions.size);
    context.closePath();

    context.fillStyle = layer.fillStyle;
    context.fill();
    context.restore();
  };

  const drawFluidMask = (layer) => {
    const x = 0;
    const y = 0;
    const amplitude = layer.maxAmplitude * Math.sin(layer.angle * Math.PI / 180);

    context.beginPath();
    context.lineTo(0, layer.initialHeight);

    while (x < defaultOptions.size) {
      y = layer.initialHeight + amplitude * Math.sin((x + layer.horizontalPosition) / layer.frequency);
      context.lineTo(x, y);
      x++;
    }
    context.lineTo(x, defaultOptions.size);
    context.lineTo(0, defaultOptions.size);
    context.closePath();
    context.clip();
  };

  const drawBubblesLayer = (dt) => {
    context.save();
    for (let i = 0; i < bubblesLayer.bubbles.length; i++) {
      const bubble = bubblesLayer.bubbles[i];

      context.beginPath();
      context.strokeStyle = 'white';
      context.arc(bubble.x, bubble.y, bubble.r, 2 * Math.PI, false);
      context.stroke();
      context.closePath();

      const currentSpeed = bubblesLayer.current * dt;

      bubble.velX = Math.abs(bubble.velX) < Math.abs(bubblesLayer.current) ? bubble.velX + currentSpeed : bubblesLayer.current;
      bubble.y = bubble.y - bubble.velY * dt;
      bubble.x = bubble.x + (bubblesLayer.swing ? 0.4 * Math.cos(bubblesLayer.swing += 0.03) * bubblesLayer.swing : 0) + bubble.velX * 0.5;

      const meterBottom = (defaultOptions.size - (defaultOptions.size - getMeterRadius()) / 2) - defaultOptions.borderWidth;
      const fluidAmount = currentFillPercentage * (getMeterRadius() - defaultOptions.borderWidth * 2) / 100;

      if (bubble.y <= meterBottom - fluidAmount) {
        bubblesLayer.reset(bubble);
      }
    }
    context.restore();
  };

  const drawText = () => {
    const text = defaultOptions.drawPercentageSign
      ? currentFillPercentage.toFixed(0) + "%"
      : currentFillPercentage.toFixed(0);

    context.save();
    context.fillStyle = defaultOptions.fontFillStyle;
    context.font = `${defaultOptions.fontSize} ${defaultOptions.fontFamily}`;
    const textWidth = context.measureText(text).width;
    context.fillText(text, (defaultOptions.size / 2) - (textWidth / 2), defaultOptions.size / 2 + parseInt(defaultOptions.fontSize) / 4);
    context.restore();
  };

  const getMeterRadius = () => {
    return defaultOptions.size - defaultOptions.borderWidth * 2;
  };

  const random = (min, max) => Math.floor(Math.random() * (max - min) + min);

  return (
    <canvas ref={canvasRef}></canvas>
  );
};

export default FluidMeter;
