module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-native-reanimated$': '<rootDir>/jest.reanimated.js',
    '^react-native-gesture-handler$': '<rootDir>/jest.gesture-handler.js',
    '^@react-native-async-storage/async-storage$':
      '@react-native-async-storage/async-storage/jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|@react-native-async-storage|react-native|@react-navigation|@reduxjs|react-redux|immer|react-native-drawer-layout|react-native-tab-view|react-native-reanimated|react-native-worklets|react-native-gesture-handler|react-native-screens|react-native-pager-view|@react-native-community)/)',
  ],
};
