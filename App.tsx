import React, { useCallback, useRef, useState } from 'react';
import {
  NavigationContainer,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider, useDispatch } from 'react-redux';
import {
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { regenerate, store, type Kind } from './quiz';
import { ClockScreen } from './screens/clock';
import { MathScreen } from './screens/math';
import { MoneyScreen } from './screens/money';
import { HistoryScreen } from './screens/history';
import { SettingsScreen } from './screens/settings';
import { s } from './styles';
import { getQuizHistory, type QuizResult } from './historyStorage';

function LatestResultBar({
  label,
  score,
  total,
  barStyle,
  animationRun,
}: {
  label: string;
  score: number;
  total: number;
  barStyle: object;
  animationRun: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const waveOffset = useRef(new Animated.Value(0)).current;
  const percentage =
    total > 0 ? Math.max(0, Math.min(100, (score / total) * 100)) : 0;
  const height = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 80],
    extrapolate: 'clamp',
  });

  React.useEffect(() => {
    progress.stopAnimation();
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: percentage,
      duration: 850,
      useNativeDriver: false,
    }).start();
  }, [animationRun, percentage, progress]);

  React.useEffect(() => {
    if (percentage === 0) return;

    const wave = Animated.loop(
      Animated.timing(waveOffset, {
        toValue: 1,
        duration: 1700,
        useNativeDriver: true,
      }),
    );
    wave.start();

    return () => wave.stop();
  }, [percentage, waveOffset]);

  const waveTranslateX = waveOffset.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -96],
  });

  return (
    <View
      accessibilityLabel={`${label} latest result`}
      accessible
      style={s.latestColumn}
    >
      <Text style={s.latestScore}>
        {total === 0
          ? '—'
          : score === 10 && total === 10
          ? '🤩'
          : score >= 8
          ? '👍'
          : score >= 5
          ? '🙂'
          : score >= 3
          ? '😐'
          : score >= 1
          ? '😟'
          : ''}
      </Text>
      <View style={s.latestTrack}>
        <Animated.View style={[s.latestFill, barStyle, { height }]}>
          {percentage > 0 && (
            <Animated.View
              style={[
                s.latestWave,
                { transform: [{ translateX: waveTranslateX }] },
              ]}
            >
              {Array.from({ length: 16 }, (_, index) => (
                <View
                  key={index}
                  style={[
                    s.latestWaveSegment,
                    barStyle,
                    {
                      left: index * 12,
                      top: [0, -2, -4, -2, 0, 2, 4, 2][index % 8],
                    },
                  ]}
                />
              ))}
            </Animated.View>
          )}
        </Animated.View>
      </View>
      {/* <Text style={s.latestLabel}>{label}</Text> */}
    </View>
  );
}

function Home() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const [latestResults, setLatestResults] = useState<
    Partial<Record<Kind, QuizResult>>
  >({});
  const [historyError, setHistoryError] = useState(false);
  const [animationRun, setAnimationRun] = useState(0);
  const historyRequest = useRef(0);
  const loadLatestResults = useCallback(async () => {
    const request = ++historyRequest.current;
    setHistoryError(false);
    try {
      const history = await getQuizHistory();
      if (request !== historyRequest.current) return;

      const latest: Partial<Record<Kind, QuizResult>> = {};
      for (const result of history) {
        const current = latest[result.kind];
        if (
          !current ||
          Date.parse(result.finishedAt) > Date.parse(current.finishedAt)
        ) {
          latest[result.kind] = result;
        }
      }
      setLatestResults(latest);
    } catch (error) {
      console.error('Failed to load latest quiz results:', error);
      if (request === historyRequest.current) setHistoryError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLatestResults();
      return () => {
        historyRequest.current += 1;
      };
    }, [loadLatestResults]),
  );

  const open = (screen: Kind) => {
    dispatch(regenerate(screen));
    navigation.navigate(
      screen === 'math' ? 'Math' : screen === 'money' ? 'Money' : 'Clock',
    );
  };
  return (
    <SafeAreaView style={s.home}>
      <ScrollView contentContainerStyle={s.homeContent}>
        <StatusBar barStyle="dark-content" />
        <View style={s.hero}>
          <Text style={s.eyebrow}>ANAK CERDIK</Text>
          <Text style={s.title}>Let’s learn{`\n`}and play!</Text>
          <Text style={s.subtitle}>
            Choose an activity to begin your 10-question challenge.
          </Text>
        </View>
        <View style={s.latestCard}>
          {historyError ? (
            <View style={s.latestError}>
              <Text style={s.latestEmpty}>
                Could not load your latest results.
              </Text>
              <Pressable onPress={loadLatestResults}>
                <Text style={s.latestRetry}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityLabel="Replay latest results chart animation"
              accessibilityRole="button"
              onPress={() => setAnimationRun(run => run + 1)}
              style={s.latestChart}
            >
              {(
                [
                  ['math', 'Math', s.latestMath],
                  ['money', 'Money', s.latestMoney],
                  ['clock', 'Time', s.latestClock],
                ] as const
              ).map(([kind, label, barStyle]) => {
                const result = latestResults[kind];
                return (
                  <LatestResultBar
                    key={kind}
                    label={label}
                    score={result?.score ?? 0}
                    total={result?.total ?? 0}
                    barStyle={barStyle}
                    animationRun={animationRun}
                  />
                );
              })}
            </Pressable>
          )}
        </View>
        <Pressable
          accessibilityLabel="Settings"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Settings')}
          style={s.settingsGear}
        >
          <Text style={s.settingsGearText}>⚙</Text>
        </Pressable>
        <View style={s.homeSections}>
          <View style={s.actions}>
            <Pressable
              style={[s.homeButton, s.mathButton]}
              onPress={() => open('math')}
            >
              <Text style={s.icon}>＋</Text>
              <Text style={s.homeText}>Math</Text>
              <Text style={s.arrow}>→</Text>
            </Pressable>
            <Pressable
              style={[s.homeButton, s.moneyButton]}
              onPress={() => open('money')}
            >
              <Text style={s.icon}>$</Text>
              <Text style={s.homeText}>Money</Text>
              <Text style={s.arrow}>→</Text>
            </Pressable>
            <Pressable
              style={[s.homeButton, s.clockButton]}
              onPress={() => open('clock')}
            >
              <Text style={s.icon}>◷</Text>
              <Text style={s.homeText}>Time</Text>
              <Text style={s.arrow}>→</Text>
            </Pressable>
            <Pressable
              style={[s.homeButton, s.historyButton]}
              onPress={() => navigation.navigate('History')}
            >
              <Text style={s.icon}>≡</Text>
              <Text style={s.homeText}>My Progress</Text>
              <Text style={s.arrow}>→</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();
const HomeDrawer = () => (
  <Drawer.Navigator>
    <Drawer.Screen
      name="Home"
      component={Home}
      options={{ headerShown: false, title: 'Anak Cerdik' }}
    />
  </Drawer.Navigator>
);
function Navigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          animation: 'none',
          headerStyle: { backgroundColor: '#F7FAFC' },
          headerTitleStyle: { fontWeight: '800' },
          headerBackTitle: 'Home',
        }}
      >
        <Stack.Screen
          name="HomeDrawer"
          component={HomeDrawer}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Math"
          component={MathScreen}
          options={{ title: 'Math challenge' }}
        />
        <Stack.Screen
          name="Money"
          component={MoneyScreen}
          options={{ title: 'Money Math challenge' }}
        />
        <Stack.Screen
          name="Clock"
          component={ClockScreen}
          options={{ title: 'Clock challenge' }}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: 'Quiz history' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
export default function App() {
  return (
    <Provider store={store}>
      <Navigator />
    </Provider>
  );
}
