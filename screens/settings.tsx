import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { resetQuizHistory } from '../historyStorage';
import { setMode, type Mode, type State } from '../quiz';
import { s } from '../styles';
import appPackage from '../package.json';

export function SettingsScreen() {
  const mode = useSelector((state: State) => state.mode);
  const dispatch = useDispatch();
  const confirmReset = () => {
    Alert.alert(
      'Reset saved data?',
      'This will permanently remove your saved quiz history from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetQuizHistory();
              Alert.alert('Data reset', 'Your saved quiz history was removed.');
            } catch (error) {
              console.error('Failed to reset saved quiz data:', error);
              Alert.alert(
                'Could not reset data',
                'Your saved quiz history could not be removed. Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={s.settingsPage}>
      <Text style={s.settingsIntro}>
        Your current learning settings are shown below.
      </Text>
      <View style={s.settingCard}>
        <View>
          <Text style={s.settingTitle}>Level</Text>
          <Text style={s.settingDescription}>
            Learning activities are set for pre-school.
          </Text>
        </View>
        <Text style={s.settingValue}>Pre-school</Text>
      </View>
      <View style={s.settingSection}>
        <Text style={s.settingTitle}>Mode</Text>
        <Text style={s.settingDescription}>
          In Learning mode, your score will not be recorded and you can review
          each question’s answer. In Quiz mode, your score will be recorded.
        </Text>
        <View style={s.modeChoices}>
          {(['learning', 'quiz'] as const).map((option: Mode) => {
            const selected = mode === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => dispatch(setMode(option))}
                style={[s.modeChoice, selected && s.modeChoiceSelected]}
              >
                <Text
                  style={[
                    s.modeChoiceText,
                    selected && s.modeChoiceTextSelected,
                  ]}
                >
                  {option === 'learning' ? 'Learning' : 'Quiz'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={s.settingSection}>
        <Text style={s.settingTitle}>Reset saved data</Text>
        <Text style={s.settingDescription}>
          Remove quiz history saved on this device.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={confirmReset}
          style={s.resetButton}
        >
          <Text style={s.resetButtonText}>Reset data</Text>
        </Pressable>
      </View>
      <View style={s.settingsFooter}>
        <Text style={s.settingsVersion}>
          Anak Cerdik · Version {appPackage.version}
        </Text>
      </View>
    </ScrollView>
  );
}
