import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Kind = 'math' | 'money' | 'clock';
export type Mode = 'learning' | 'quiz';
export type Question = {
  id: string;
  prompt: string;
  answer: number;
  options: number[];
  hour?: number;
  minute?: number;
};
export type Quiz = { questions: Question[]; selected: Record<string, number> };

const pick = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T>(list: T[]) => [...list].sort(() => Math.random() - 0.5);
const choices = (answer: number) => {
  const values = new Set([answer]);
  while (values.size < 4)
    values.add(Math.max(0, answer + (pick(-10, 10) || 1)));
  return shuffle([...values]);
};
const moneyChoices = (answer: number) => {
  const values = new Set([answer]);
  while (values.size < 4) {
    const offset = (pick(-50, 50) || 1) * 10;
    values.add(Math.max(0, answer + offset));
  }
  return shuffle([...values]);
};
const formatMoney = (cents: number) => `RM ${(cents / 100).toFixed(2)}`;
const math = (): Question[] =>
  shuffle([
    ...Array.from({ length: 5 }, (_, i) => {
      const a = pick(1, 20),
        b = pick(1, 20),
        answer = a + b;
      return {
        id: `a-${Date.now()}-${i}`,
        prompt: `${a} + ${b} = ?`,
        answer,
        options: choices(answer),
      };
    }),
    ...Array.from({ length: 5 }, (_, i) => {
      const a = pick(10, 30),
        b = pick(1, a),
        answer = a - b;
      return {
        id: `s-${Date.now()}-${i}`,
        prompt: `${a} − ${b} = ?`,
        answer,
        options: choices(answer),
      };
    }),
  ]);
const money = (): Question[] =>
  shuffle([
    ...Array.from({ length: 5 }, (_, i) => {
      const a = pick(10, 200) * 10;
      const b = pick(10, 200) * 10;
      const answer = a + b;
      return {
        id: `money-a-${Date.now()}-${i}`,
        prompt: `${formatMoney(a)} + ${formatMoney(b)} = ?`,
        answer,
        options: moneyChoices(answer),
      };
    }),
    ...Array.from({ length: 5 }, (_, i) => {
      const a = pick(10, 200) * 10;
      const b = pick(1, a / 10) * 10;
      const answer = a - b;
      return {
        id: `money-s-${Date.now()}-${i}`,
        prompt: `${formatMoney(a)} − ${formatMoney(b)} = ?`,
        answer,
        options: moneyChoices(answer),
      };
    }),
  ]);
const clock = (): Question[] =>
  Array.from({ length: 10 }, (_, i) => {
    const hour = pick(1, 12),
      minute = pick(0, 11) * 5,
      answer = hour * 60 + minute;
    return {
      id: `c-${Date.now()}-${i}`,
      prompt: 'What time is shown?',
      answer,
      options: choices(answer),
      hour,
      minute,
    };
  });
const fresh = (kind: Kind): Quiz => ({
  questions: kind === 'math' ? math() : kind === 'money' ? money() : clock(),
  selected: {},
});

const quizSlice = createSlice({
  name: 'quiz',
  initialState: {
    math: fresh('math'),
    money: fresh('money'),
    clock: fresh('clock'),
  } as Record<Kind, Quiz>,
  reducers: {
    regenerate: (state, action: PayloadAction<Kind>) => {
      state[action.payload] = fresh(action.payload);
    },
    choose: (
      state,
      action: PayloadAction<{ kind: Kind; id: string; answer: number }>,
    ) => {
      state[action.payload.kind].selected[action.payload.id] =
        action.payload.answer;
    },
  },
});

const modeSlice = createSlice({
  name: 'mode',
  initialState: 'quiz' as Mode,
  reducers: {
    setMode: (_state, action: PayloadAction<Mode>) => action.payload,
  },
});

export const store = configureStore({
  reducer: { quiz: quizSlice.reducer, mode: modeSlice.reducer },
});
export type State = ReturnType<typeof store.getState>;
export const { regenerate, choose } = quizSlice.actions;
export const { setMode } = modeSlice.actions;
