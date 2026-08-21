import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type FilledIconCircleProps = {
  name: IoniconName;
  backgroundColor: string;
  size?: number;
};

export function FilledIconCircle({
  name,
  backgroundColor,
  size = 72,
}: FilledIconCircleProps) {
  return (
    <View style={[styles.filled, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
      <Ionicons name={name} size={size * 0.42} color="#FFFFFF" />
    </View>
  );
}

type OutlinedIconCircleProps = {
  name: IoniconName;
  color: string;
  size?: number;
};

export function OutlinedIconCircle({
  name,
  color,
  size = 58,
}: OutlinedIconCircleProps) {
  return (
    <View
      style={[
        styles.outlined,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
        },
      ]}
    >
      <Ionicons name={name} size={size * 0.42} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  filled: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlined: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    backgroundColor: 'transparent',
  },
});
