import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

function buildPolylinePoints(values: number[], width: number, height: number, pad: number): string {
  if (values.length === 0) {
    return '';
  }
  if (values.length === 1) {
    const y = height / 2;
    return `${pad},${y} ${width - pad},${y}`;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - 2 * pad);
      const y = pad + (1 - (v - min) / range) * (height - 2 * pad);
      return `${x},${y}`;
    })
    .join(' ');
}

type SectorSparklineProps = {
  values: number[];
  strokeColor: string;
  width?: number;
  height?: number;
};

/**
 * Compact sparkline for sector tiles; values are pre-normalized mock indices.
 */
export default function SectorSparkline({
  values,
  strokeColor,
  width = 78,
  height = 34,
}: SectorSparklineProps) {
  const points = useMemo(
    () => buildPolylinePoints(values, width, height, 2.5),
    [values, width, height],
  );

  if (values.length === 0 || !points) {
    return <View style={{ width, height }} accessible={false} />;
  }

  return (
    <View style={{ width, height }} accessible={false}>
      <Svg width={width} height={height}>
        <Polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
