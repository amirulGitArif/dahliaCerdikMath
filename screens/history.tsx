import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { getQuizHistory, type QuizResult } from '../historyStorage';
import { s } from '../styles';

export function HistoryScreen() {
  const [history, setHistory] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const loadHistory = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(false);
    try {
      const results = await getQuizHistory();
      if (currentRequest === requestId.current) setHistory(results);
    } catch (loadError) {
      console.error('Failed to load quiz history:', loadError);
      if (currentRequest === requestId.current) setError(true);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
      return () => {
        requestId.current += 1;
      };
    }, [loadHistory]),
  );

  return (
    <ScrollView contentContainerStyle={s.historyPage}>
      <Text style={s.historyIntro}>
        Your completed quizzes are saved on this device.
      </Text>
      {loading ? (
        <View style={s.emptyHistory}>
          <Text style={s.emptyHistoryText}>Loading quiz history…</Text>
        </View>
      ) : error ? (
        <View style={s.emptyHistory}>
          <Text style={s.emptyHistoryText}>
            Could not load quiz history. Please try again.
          </Text>
          <Pressable style={s.retry} onPress={() => void loadHistory()}>
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : history.length === 0 ? (
        <View style={s.emptyHistory}>
          <Text style={s.emptyHistoryText}>No completed quizzes yet.</Text>
        </View>
      ) : (
        history.map(item => (
          <View key={item.id} style={s.historyItem}>
            <View>
              <Text style={s.historyKind}>
                {item.kind === 'math'
                  ? 'Math'
                  : item.kind === 'money'
                    ? 'Money Math'
                    : 'Clock'}{' '}
                quiz
              </Text>
              <Text style={s.historyDate}>
                {new Date(item.finishedAt).toLocaleString()}
              </Text>
            </View>
            <View
              style={[
                s.historyScoreBadge,
                item.score === 10 && item.total === 10
                  ? s.historyScorePerfect
                  : item.score >= 8
                    ? s.historyScoreHigh
                    : item.score >= 5
                      ? s.historyScoreMedium
                      : item.score >= 3
                        ? s.historyScoreLow
                        : s.historyScoreVeryLow,
              ]}
            >
              <Text
                style={[
                  s.historyScore,
                  item.score === 10 && item.total === 10
                    ? s.historyScorePerfectText
                    : item.score >= 8
                      ? s.historyScoreHighText
                      : item.score >= 5
                        ? s.historyScoreMediumText
                        : item.score >= 3
                          ? s.historyScoreLowText
                          : s.historyScoreVeryLowText,
                ]}
              >
                {item.score}/{item.total}
              </Text>
              {item.score === 10 && item.total === 10 ? (
                <Text style={s.historyScoreIcon}>🤩</Text>
              ) : item.score >= 8 ? (
                <Text style={s.historyScoreIcon}>👍</Text>
              ) : item.score >= 5 ? (
                <Text style={s.historyScoreIcon}>🙂</Text>
              ) : item.score >= 3 ? (
                <Text style={s.historyScoreIcon}>😐</Text>
              ) : item.score >= 1 ? (
                <Text style={s.historyScoreIcon}>😟</Text>
              ) : null}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
