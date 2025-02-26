import { color } from 'd3-color';
import { interpolateRgb } from 'd3-interpolate';
import React from 'react';
import LiquidFillGauge from 'react-liquid-gauge';

interface LiquidMeterProps {
  filled: number;
  max: number;
  whId: string;
}

const LiquidMeter: React.FC<LiquidMeterProps> = ({ filled, max, whId }) => {
  const value = (filled / max) * 100; // Calculate percentage based on filled and max
  const startColor = '#6495ed'; // cornflowerblue
  const endColor = '#dc143c'; // crimson
  const radius = 100;

  // Interpolate between two colors based on the value
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
    <div>
      <LiquidFillGauge
        style={{ margin: '0 auto' }}
        width={radius * 2}
        height={radius * 2}
        value={value}
        percent="%"
        textSize={1}
        textOffsetX={0}
        textOffsetY={-30}
        textRenderer={(props: any) => {
          const value = Math.round(props.value);
          const radius = Math.min(props.height / 2, props.width / 2);
          const textPixels = (props.textSize * radius) / 2;
          const valueStyle = {
            fontSize: textPixels,
          };
          const percentStyle = {
            fontSize: textPixels * 0.6,
          };
          const whStyle = {
            fontSize: textPixels * 0.4,
          };
          const idStyle = {
            fontSize: textPixels * 0.3,
          };
          const captionSmall = {
            fontSize: textPixels * 0.2,
          };

          return (
            <tspan>
              <tspan className="value" style={valueStyle}>{value}</tspan>
              <tspan style={percentStyle}>{props.percent}</tspan>
              
              <tspan x="0" dy="1.5em" style={idStyle}>{max-filled}</tspan>
              <tspan x="0" dy="1.5em" style={captionSmall}>*</tspan>
              <tspan x="0" dy="1.5em" style={idStyle}>{filled}</tspan>
              <tspan x="0" dy="1.5em" style={whStyle}>{whId}</tspan>
            </tspan>
          );
        }}
        riseAnimation
        waveAnimation
        waveFrequency={2}
        waveAmplitude={1}
        gradient
        gradientStops={gradientStops}
        circleStyle={{
          fill: fillColor,
        }}
        waveStyle={{
          fill: fillColor,
        }}
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
