import { color } from 'd3-color';
import { interpolateRgb } from 'd3-interpolate';
import React, { useState, useEffect } from 'react';
import LiquidFillGauge from 'react-liquid-gauge';

interface LiquidMeterProps {
  filled: number;
  max: number;
  whId: string;
  diameter?: number; // diameter gauge dalam px (opsional)
}

const LiquidMeter: React.FC<LiquidMeterProps> = ({ filled, max, whId, diameter }) => {
  // jika diameter tidak dikirim, otomatis ambil % dari lebar layar
  const [size, setSize] = useState(diameter ?? Math.min(window.innerWidth * 0.4, 300));

  useEffect(() => {
    if (diameter) return; // kalau user sudah kasih diameter jangan override
    const handleResize = () => {
      setSize(Math.min(window.innerWidth * 0.4, 300)); // responsif, max 300px
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [diameter]);

  const value = (filled / max) * 100;
  const startColor = '#6495ed';
  const endColor = '#dc143c';
  const interpolate = interpolateRgb(startColor, endColor);
  const fillColor = interpolate(value / 100);

  const gradientStops = [
    {
      key: '0%',
      stopColor: color(fillColor).darker(0.5).toString(),
      stopOpacity: 1,
      offset: '0%',
    },
    {
      key: '50%',
      stopColor: fillColor,
      stopOpacity: 0.75,
      offset: '50%',
    },
    {
      key: '100%',
      stopColor: color(fillColor).brighter(0.5).toString(),
      stopOpacity: 0.5,
      offset: '100%',
    },
  ];

  return (
    <div style={{ width: size * 2 }}>
      <LiquidFillGauge
        style={{ margin: '0 auto' }}
        width={size}
        height={size}
        value={value}
        percent="%"
        textSize={1}
        textOffsetX={0}
        textOffsetY={-size * 0.15} // relatif terhadap diameter
        textRenderer={(props: any) => {
          const val = Math.round(props.value);
          const radius = Math.min(props.height / 2, props.width / 2);
          const textPixels = (props.textSize * radius) / 2;

          return (
            <tspan>
              <tspan className="value" style={{ fontSize: textPixels }}>{val}</tspan>
              <tspan style={{ fontSize: textPixels * 0.6 }}>{props.percent}</tspan>

              <tspan x="0" dy="1.5em" style={{ fontSize: textPixels * 0.3 }}>{max - filled}</tspan>
              <tspan x="0" dy="1.5em" style={{ fontSize: textPixels * 0.2 }}>*</tspan>
              <tspan x="0" dy="1.5em" style={{ fontSize: textPixels * 0.3 }}>{filled}</tspan>
              <tspan x="0" dy="1.5em" style={{ fontSize: textPixels * 0.4 }}>{whId}</tspan>
            </tspan>
          );
        }}
        riseAnimation
        waveAnimation
        waveFrequency={2}
        waveAmplitude={1}
        gradient
        gradientStops={gradientStops}
        circleStyle={{ fill: fillColor }}
        waveStyle={{ fill: fillColor }}
        textStyle={{
          fill: color('#444').toString(),
          fontFamily: 'Arial',
        }}
        waveTextStyle={{
          fill: color('#fff').toString(),
          fontFamily: 'Arial',
        }}
      />
    </div>
  );
};

export default LiquidMeter;
