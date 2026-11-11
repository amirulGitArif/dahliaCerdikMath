import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useNavigation,
  usePreventRemove,
  useRoute,
  type NavigationAction,
} from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { choose, regenerate, type Kind, type State } from './quiz';
import { s } from './styles';
import { saveQuizResult, type QuizResult } from './historyStorage';
import { verifyParentPin } from './parentPin';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ClockFace({ hour, minute }: { hour: number; minute: number }) {
  return (
    <View style={s.face}>
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI) / 6;
        const left = 50 + 38 * Math.sin(angle);
        const top = 50 - 38 * Math.cos(angle);
        const number = i === 0 ? 12 : i;

        return (
          <Text
            key={number}
            style={[s.num, { left: `${left}%`, top: `${top}%` }]}
          >
            {number}
          </Text>
        );
      })}
      <View
        style={[
          s.hand,
          s.hour,
          { transform: [{ rotate: `${hour * 30 + minute * 0.5}deg` }] },
        ]}
      />
      <View
        style={[
          s.hand,
          s.minute,
          { transform: [{ rotate: `${minute * 6}deg` }] },
        ]}
      />
      <View style={s.center} />
    </View>
  );
}

const time = (value: number) =>
  `${Math.floor(value / 60) || 12}:${String(value % 60).padStart(2, '0')}`;
const formatMoney = (cents: number) => `RM ${(cents / 100).toFixed(2)}`;
const formatAnswer = (kind: Kind, value: number) =>
  kind === 'clock'
    ? time(value)
    : kind === 'money'
    ? formatMoney(value)
    : value;

function ParentPinModal({
  visible,
  pin,
  error,
  verifying,
  onChangePin,
  onContinue,
  onUnlock,
}: {
  visible: boolean;
  pin: string;
  error: string | null;
  verifying: boolean;
  onChangePin: (value: string) => void;
  onContinue: () => void;
  onUnlock: () => void;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onContinue}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.pinBackdrop}
      >
        <View
          accessibilityViewIsModal
          style={s.pinDialog}
          accessibilityRole="alert"
        >
          <Text style={s.pinTitle}>Parent Permission Required</Text>
          <Text style={s.pinMessage}>
            Ask a parent to enter their PIN before leaving this quiz.
          </Text>
          <TextInput
            accessibilityLabel="Parent PIN"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            onChangeText={onChangePin}
            onSubmitEditing={onUnlock}
            returnKeyType="done"
            secureTextEntry
            style={s.pinInput}
            value={pin}
          />
          {error && (
            <Text
              accessibilityLiveRegion="assertive"
              style={s.pinError}
            >
              {error}
            </Text>
          )}
          <Pressable
            accessibilityLabel="Continue Quiz"
            accessibilityRole="button"
            onPress={onContinue}
            style={s.pinContinue}
          >
            <Text style={s.pinContinueText}>Continue Quiz</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Unlock and Exit"
            accessibilityRole="button"
            disabled={verifying}
            onPress={onUnlock}
            style={[s.pinUnlock, verifying && s.pinButtonDisabled]}
          >
            {verifying ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={s.pinUnlockText}>Unlock &amp; Exit</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function QuizScreen({ kind }: { kind: Kind }) {
  const quiz = useSelector((state: State) => state.quiz[kind]);
  const mode = useSelector((state: State) => state.mode);
  const learningMode = mode === 'learning';
  const dispatch = useDispatch();
  const [index, setIndex] = useState(0);
  const [answerChecked, setAnswerChecked] = useState(false);
  const answerPulse = useRef(new Animated.Value(0)).current;
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const savedResult = useRef<QuizResult | null>(null);
  const route = useRoute();
  const navigation = useNavigation<any>();
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [isProtectionDisabled, setIsProtectionDisabled] = useState(false);
  const pendingAction = useRef<NavigationAction | null>(null);
  const modalOpen = useRef(false);
  const mounted = useRef(true);
  const verificationAttempt = useRef(0);
  const verificationInProgress = useRef(false);
  const isQuizComplete = index === 10;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pendingAction.current = null;
      modalOpen.current = false;
      verificationAttempt.current += 1;
    };
  }, []);

  usePreventRemove(!isQuizComplete && !isProtectionDisabled, ({ data }) => {
    if (!mounted.current || modalOpen.current) return;

    pendingAction.current = data.action;
    modalOpen.current = true;
    setPin('');
    setPinError(null);
    setPinModalVisible(true);
  });

  useEffect(() => {
    if (!isProtectionDisabled) return;

    const action = pendingAction.current;
    pendingAction.current = null;
    modalOpen.current = false;
    setPinModalVisible(false);
    setPin('');

    if (action && mounted.current) {
      const state = navigation.getState?.();
      const routeIsStillMounted = state?.routes?.some(
        (item: { key?: string }) => item.key === route.key,
      );
      if (routeIsStillMounted) {
        dispatch(regenerate(kind));
        navigation.dispatch(action);
      }
    }
    setIsProtectionDisabled(false);
  }, [dispatch, isProtectionDisabled, kind, navigation, route.key]);

  useEffect(() => {
    if (!isQuizComplete) return;
    verificationAttempt.current += 1;
    verificationInProgress.current = false;
    pendingAction.current = null;
    modalOpen.current = false;
    setPinModalVisible(false);
    setPin('');
    setPinError(null);
    setIsVerifyingPin(false);
    setIsProtectionDisabled(false);
  }, [isQuizComplete]);

  const continueQuiz = () => {
    verificationAttempt.current += 1;
    verificationInProgress.current = false;
    pendingAction.current = null;
    modalOpen.current = false;
    setPinModalVisible(false);
    setPin('');
    setPinError(null);
    setIsVerifyingPin(false);
  };

  const unlockAndExit = async () => {
    if (verificationInProgress.current || !pendingAction.current) return;
    if (!pin) {
      setPinError('Enter the parent PIN to continue.');
      return;
    }

    verificationInProgress.current = true;
    const attempt = ++verificationAttempt.current;
    setIsVerifyingPin(true);
    setPinError(null);
    try {
      const result = await verifyParentPin(pin);
      if (!mounted.current || attempt !== verificationAttempt.current) return;

      if (result.status === 'authenticated') {
        setIsProtectionDisabled(true);
      } else if (result.status === 'not-configured') {
        setPinError(
          'A secure parent PIN has not been set up on this device. Quiz protection is still on.',
        );
        setPin('');
      } else {
        setPinError('That PIN is incorrect. Please try again.');
        setPin('');
      }
    } catch {
      if (!mounted.current || attempt !== verificationAttempt.current) return;
      setPinError('The parent PIN could not be checked. Please try again.');
      setPin('');
    } finally {
      if (mounted.current && attempt === verificationAttempt.current) {
        verificationInProgress.current = false;
        setIsVerifyingPin(false);
      }
    }
  };

  useEffect(() => {
    answerPulse.setValue(0);
    if (!learningMode || !answerChecked) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(answerPulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        }),
        Animated.timing(answerPulse, {
          toValue: 0,
          duration: 700,
          useNativeDriver: false,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [answerChecked, answerPulse, learningMode]);

  const persistResult = useCallback(async (result: QuizResult) => {
    setSaveStatus('saving');
    try {
      await saveQuizResult(result);
      if (savedResult.current?.id === result.id) setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save quiz result:', error);
      if (savedResult.current?.id === result.id) setSaveStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!isQuizComplete || learningMode) return;

    if (!savedResult.current) {
      const score = quiz.questions.filter(
        question => quiz.selected[question.id] === question.answer,
      ).length;
      savedResult.current = {
        id: `${kind}-${Date.now()}`,
        kind,
        score,
        total: quiz.questions.length,
        finishedAt: new Date().toISOString(),
        questions: quiz.questions,
        selected: quiz.selected,
      };
    }
    void persistResult(savedResult.current);
  }, [isQuizComplete, kind, learningMode, persistResult, quiz]);

  const startNewQuiz = () => {
    savedResult.current = null;
    setSaveStatus('idle');
    setIsProtectionDisabled(false);
    setIndex(0);
    dispatch(regenerate(kind));
  };

  const pinModal = (
    <ParentPinModal
      error={pinError}
      onChangePin={value => setPin(value.replace(/\D/g, ''))}
      onContinue={continueQuiz}
      onUnlock={unlockAndExit}
      pin={pin}
      verifying={isVerifyingPin}
      visible={pinModalVisible && !isQuizComplete}
    />
  );

  if (index === 10) {
    if (learningMode) {
      return (
        <>
          {pinModal}
          <ScrollView contentContainerStyle={s.page}>
            <View style={s.done}>
              <Text style={s.star}>★</Text>
              <Text style={s.doneTitle}>Learning session complete!</Text>
              <Pressable style={s.retry} onPress={startNewQuiz}>
                <Text style={s.retryText}>Try a new quiz</Text>
              </Pressable>
            </View>
          </ScrollView>
        </>
      );
    }
    const score = quiz.questions.filter(
      q => quiz.selected[q.id] === q.answer,
    ).length;
    return (
      <>
        {pinModal}
        <ScrollView contentContainerStyle={s.page}>
          <View style={s.done}>
            <Text style={s.star}>★</Text>
            <Text style={s.doneTitle}>Great work!</Text>
            <Text style={s.score}>You got {score} out of 10 correct.</Text>
            <Pressable style={s.retry} onPress={startNewQuiz}>
              <Text style={s.retryText}>Try a new quiz</Text>
            </Pressable>
            {saveStatus === 'saving' && (
              <Text style={s.historyDate}>Saving result to history…</Text>
            )}
            {saveStatus === 'saved' && (
              <Text style={s.historyDate}>Result saved to history.</Text>
            )}
            {saveStatus === 'error' && (
              <View>
                <Text style={s.wrongAnswer}>
                  Could not save your result. Check device storage and try again.
                </Text>
                <Pressable
                  style={s.retry}
                  onPress={() => {
                    if (savedResult.current) {
                      void persistResult(savedResult.current);
                    }
                  }}
                >
                  <Text style={s.retryText}>Retry saving</Text>
                </Pressable>
              </View>
            )}
          </View>
          <Text style={s.reviewTitle}>Review incorrect answers</Text>
          {quiz.questions
            .filter(
              question => quiz.selected[question.id] !== question.answer,
            )
            .map(question => {
              const selected = quiz.selected[question.id];
              return (
                <View key={question.id} style={s.wrongReview}>
                  <Text style={s.wrongQuestion}>{question.prompt}</Text>
                  <Text style={s.wrongAnswer}>
                    Your answer:{' '}
                    {selected === undefined
                      ? 'No answer'
                      : formatAnswer(kind, selected)}
                  </Text>
                  <Text style={s.correctAnswer}>
                    Correct answer: {formatAnswer(kind, question.answer)}
                  </Text>
                </View>
              );
            })}
          {score === 10 && (
            <Text style={s.perfectText}>
              Perfect score — there are no incorrect answers to review.
            </Text>
          )}
        </ScrollView>
      </>
    );
  }

  const question = quiz.questions[index];
  const answer = quiz.selected[question.id];
  return (
    <>
      {pinModal}
      <ScrollView contentContainerStyle={s.page}>
        <Text style={s.label}>
          {kind === 'math'
            ? 'MATH CHALLENGE'
            : kind === 'money'
            ? 'MONEY MATH CHALLENGE'
            : 'CLOCK CHALLENGE'}
        </Text>
        <Text style={s.progress}>Question {index + 1} of 10</Text>
        <View style={s.track}>
          <View style={[s.fill, { width: `${(index + 1) * 10}%` }]} />
        </View>
        <View style={s.card}>
          {kind === 'clock' && (
            <ClockFace hour={question.hour!} minute={question.minute!} />
          )}
          <Text style={[s.question, kind === 'clock' && s.clockPrompt]}>
            {question.prompt}
          </Text>
        </View>
        <View style={s.options}>
          {question.options.map((option, optionIndex) => {
            const selected = answer === option;
            const correct = option === question.answer;
            const feedbackStyle =
              learningMode && answerChecked
                ? selected && correct
                  ? s.optionCorrect
                  : selected
                  ? s.optionWrong
                  : correct
                  ? s.optionAnswer
                  : undefined
                : undefined;
            const pulseStyle =
              learningMode && answerChecked && correct
                ? {
                    borderColor: answerPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: selected
                        ? ['#86EFAC', '#16A34A']
                        : ['#93C5FD', '#2563EB'],
                    }),
                    transform: [
                      {
                        scale: answerPulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.97, 1.04],
                        }),
                      },
                    ],
                  }
                : undefined;
            return (
              <AnimatedPressable
                key={option}
                disabled={learningMode && answerChecked}
                onPress={() =>
                  dispatch(choose({ kind, id: question.id, answer: option }))
                }
                style={[
                  s.option,
                  selected && s.optionSelected,
                  feedbackStyle,
                  pulseStyle,
                ]}
              >
                <View
                  style={[
                    s.letter,
                    selected && s.letterSelected,
                    learningMode &&
                      answerChecked &&
                      correct &&
                      (selected ? s.letterCorrect : s.letterAnswer),
                    learningMode &&
                      answerChecked &&
                      selected &&
                      !correct &&
                      s.letterWrong,
                  ]}
                >
                  <Text
                    style={[
                      s.letterText,
                      selected && s.selectedText,
                      learningMode &&
                        answerChecked &&
                        correct &&
                        s.selectedText,
                    ]}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </Text>
                </View>
                <Text
                  style={[
                    s.optionText,
                    selected && s.blueText,
                    learningMode &&
                      answerChecked &&
                      selected &&
                      correct &&
                      s.feedbackCorrectText,
                    learningMode &&
                      answerChecked &&
                      selected &&
                      !correct &&
                      s.feedbackWrongText,
                    learningMode &&
                      answerChecked &&
                      !selected &&
                      correct &&
                      s.feedbackAnswerText,
                  ]}
                >
                  {formatAnswer(kind, option)}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
        <Pressable
          accessibilityLabel={
            learningMode
              ? answerChecked
                ? 'Next'
                : 'Check for an answer'
              : index === 9
              ? 'Finish quiz'
              : 'Next question'
          }
          accessibilityRole="button"
          disabled={answer === undefined && !answerChecked}
          onPress={() => {
            if (learningMode && !answerChecked) {
              setAnswerChecked(true);
              return;
            }
            setAnswerChecked(false);
            setIndex(i => i + 1);
          }}
          style={[
            s.next,
            answer === undefined && !answerChecked && s.disabled,
            learningMode &&
              answerChecked &&
              answer === question.answer &&
              s.nextCorrect,
          ]}
        >
          <Text style={s.nextText}>
            {learningMode
              ? answerChecked
                ? 'Next'
                : 'Check for an answer'
              : index === 9
              ? 'Finish'
              : 'Next question'}
          </Text>
        </Pressable>
      </ScrollView>
    </>
  );
}
