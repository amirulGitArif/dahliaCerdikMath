import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Kind, Question } from './quiz';

const HISTORY_KEY = '@dahlia-cerdik/quiz-history';

export type QuizResult = {
  id: string;
  kind: Kind;
  score: number;
  total: number;
  finishedAt: string;
  questions: Question[];
  selected: Record<string, number>;
};

function isQuizResult(value: unknown): value is QuizResult {
  if (typeof value !== 'object' || value === null) return false;
  if (
    !('id' in value) ||
    !('kind' in value) ||
    !('score' in value) ||
    !('total' in value) ||
    !('finishedAt' in value) ||
    !('questions' in value) ||
    !('selected' in value)
  ) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    (value.kind === 'math' ||
      value.kind === 'money' ||
      value.kind === 'clock') &&
    typeof value.score === 'number' &&
    Number.isFinite(value.score) &&
    typeof value.total === 'number' &&
    Number.isFinite(value.total) &&
    typeof value.finishedAt === 'string' &&
    Number.isFinite(Date.parse(value.finishedAt)) &&
    Array.isArray(value.questions) &&
    typeof value.selected === 'object' &&
    value.selected !== null
  );
}

export async function saveQuizResult(result: QuizResult) {
  const history = await getQuizHistory();
  const updatedHistory = [
    result,
    ...history.filter(item => item.id !== result.id),
  ];
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
}

export async function getQuizHistory(): Promise<QuizResult[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];

  const history: unknown = JSON.parse(raw);
  if (!Array.isArray(history) || !history.every(isQuizResult)) {
    throw new Error('Saved quiz history has an invalid format.');
  }

  return history;
}

export async function resetQuizHistory() {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
