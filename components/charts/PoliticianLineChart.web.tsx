import { View } from 'react-native';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Colors } from '@/constants/theme/Colors';
import { getSemanticColors } from '@/constants/theme/ThemeTokens';
import { useColorScheme } from '@/hooks/useColorScheme';

const SAMPLE = [
  { month: 'Jan', score: 42 },
  { month: 'Feb', score: 55 },
  { month: 'Mar', score: 48 },
  { month: 'Apr', score: 61 },
  { month: 'May', score: 58 },
  { month: 'Jun', score: 67 },
];

export default function PoliticianLineChart() {
  const colorScheme = useColorScheme() ?? 'light';
  const accent = Colors[colorScheme].tint;
  const muted = Colors[colorScheme].icon;
  const semantic = getSemanticColors(colorScheme);
  const grid = semantic.cardBorder;
  const label = muted;

  return (
    <View style={{ width: '100%', height: 240, marginBottom: 8, maxWidth: 560, alignSelf: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={SAMPLE} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={grid} strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fill: label, fontSize: 12 }} tickLine={false} axisLine={{ stroke: grid }} />
          <YAxis tick={{ fill: label, fontSize: 12 }} tickLine={false} axisLine={{ stroke: grid }} width={36} />
          <Tooltip
            contentStyle={{
              backgroundColor: semantic.cardBackground,
              border: `1px solid ${grid}`,
              borderRadius: 8,
            }}
            labelStyle={{ color: label }}
            itemStyle={{ color: accent }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke={accent}
            strokeWidth={2}
            dot={{ r: 4, fill: accent }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </View>
  );
}
