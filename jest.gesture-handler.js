const {View} = require('react-native');
const gesture = {onStart: () => gesture, onBegin: () => gesture, onUpdate: () => gesture, onChange: () => gesture, onEnd: () => gesture, onFinalize: () => gesture, enabled: () => gesture, activeOffsetX: () => gesture, failOffsetY: () => gesture, hitSlop: () => gesture, shouldCancelWhenOutside: () => gesture, minDistance: () => gesture};
module.exports = {
  GestureHandlerRootView: View,
  PanGestureHandler: View,
  NativeViewGestureHandler: View,
  GestureDetector: View,
  Gesture: {Pan: () => gesture, Native: () => gesture, Simultaneous: () => gesture},
  State: {},
  Directions: {},
};
