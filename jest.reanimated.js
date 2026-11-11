const React = require('react');
const {View} = require('react-native');

const Animated = {
  View,
  createAnimatedComponent: component => component,
};

module.exports = {
  ...Animated,
  default: Animated,
  useSharedValue: value => ({value}),
  useAnimatedStyle: style => style(),
  useAnimatedProps: props => props(),
  useDerivedValue: fn => ({value: fn()}),
  withTiming: value => value,
  withSpring: value => value,
  runOnJS: fn => fn,
  interpolate: value => value,
  Extrapolation: {CLAMP: 'clamp'},
  ReduceMotion: {Never: 'never'},
};
