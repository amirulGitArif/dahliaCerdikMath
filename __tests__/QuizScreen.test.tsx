import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Modal, Text, TextInput } from 'react-native';
import {
  useNavigation,
  usePreventRemove,
  useRoute,
} from '@react-navigation/native';
import { Provider } from 'react-redux';
import QuizScreen from '../QuizScreen';
import { choose, regenerate, setMode, store } from '../quiz';
import { verifyParentPin } from '../parentPin';
import { saveQuizResult } from '../historyStorage';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
    usePreventRemove: jest.fn(),
    useRoute: jest.fn(),
  };
});

jest.mock('../parentPin', () => ({
  verifyParentPin: jest.fn(),
}));

jest.mock('../historyStorage', () => ({
  saveQuizResult: jest.fn().mockResolvedValue(undefined),
}));

const mockedNavigation = {
  dispatch: jest.fn(),
  getState: jest.fn(() => ({ routes: [{ key: 'quiz-route' }] })),
};
const mockedUsePreventRemove = usePreventRemove as jest.Mock;
const mockedVerifyParentPin = verifyParentPin as jest.Mock;
let renderer: ReturnType<typeof ReactTestRenderer.create>;

function renderQuiz() {
  act(() => {
    renderer = ReactTestRenderer.create(
      <Provider store={store}>
        <QuizScreen kind="math" />
      </Provider>,
    );
  });
}

function pressButton(label: string) {
  const button = renderer.root.find(
    node => node.props.accessibilityLabel === label,
  );
  act(() => button.props.onPress());
}

function pressButtonByText(label: string) {
  const text = renderer.root
    .findAllByType(Text)
    .find(node => node.props.children === label);
  let button = text?.parent;
  while (button && typeof button.props.onPress !== 'function') {
    button = button.parent;
  }
  if (!button) throw new Error(`Button "${label}" was not found.`);
  act(() => button?.props.onPress());
}

function requestRemoval(action = { type: 'GO_BACK' }) {
  const callback =
    mockedUsePreventRemove.mock.calls[
      mockedUsePreventRemove.mock.calls.length - 1
    ][1];
  act(() => callback({ data: { action } }));
  return action;
}

function isRemovalPrevented() {
  return mockedUsePreventRemove.mock.calls[
    mockedUsePreventRemove.mock.calls.length - 1
  ][0] as boolean;
}

beforeEach(() => {
  mockedNavigation.dispatch.mockReset();
  mockedNavigation.getState.mockReturnValue({
    routes: [{ key: 'quiz-route' }],
  });
  mockedUsePreventRemove.mockReset();
  (useNavigation as jest.Mock).mockReturnValue(mockedNavigation);
  (useRoute as jest.Mock).mockReturnValue({ key: 'quiz-route' });
  mockedVerifyParentPin.mockReset();
  mockedVerifyParentPin.mockResolvedValue({ status: 'incorrect' });
  (saveQuizResult as jest.Mock).mockClear();
  store.dispatch(setMode('quiz'));
  store.dispatch(regenerate('math'));
});

afterEach(() => {
  act(() => renderer.unmount());
});

test('an incomplete quiz prevents removal and Continue Quiz stays on the quiz', () => {
  renderQuiz();
  const action = requestRemoval();

  expect(isRemovalPrevented()).toBe(true);
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  pressButton('Continue Quiz');

  expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  expect(mockedNavigation.dispatch).not.toHaveBeenCalled();
  expect(isRemovalPrevented()).toBe(true);
  expect(action).toEqual({ type: 'GO_BACK' });
});

test('an incorrect PIN keeps the quiz protected and does not dispatch', async () => {
  renderQuiz();
  requestRemoval();

  act(() => {
    renderer.root.findByType(TextInput).props.onChangeText('1234');
  });
  await act(async () => {
    await renderer.root
      .find(node => node.props.accessibilityLabel === 'Unlock and Exit')
      .props.onPress();
  });

  expect(
    renderer.root.findAllByType(Text).some(node =>
      String(node.props.children).includes('That PIN is incorrect'),
    ),
  ).toBe(true);
  expect(mockedNavigation.dispatch).not.toHaveBeenCalled();
  expect(isRemovalPrevented()).toBe(true);
});

test('an unconfigured secure PIN reports an error and keeps protection enabled', async () => {
  mockedVerifyParentPin.mockResolvedValue({ status: 'not-configured' });
  renderQuiz();
  requestRemoval();

  act(() => {
    renderer.root.findByType(TextInput).props.onChangeText('4831');
  });
  await act(async () => {
    await renderer.root
      .find(node => node.props.accessibilityLabel === 'Unlock and Exit')
      .props.onPress();
  });

  expect(
    renderer.root.findAllByType(Text).some(node =>
      String(node.props.children).includes('has not been set up'),
    ),
  ).toBe(true);
  expect(mockedNavigation.dispatch).not.toHaveBeenCalled();
  expect(isRemovalPrevented()).toBe(true);
});

test('a correct PIN resumes the original removal action once', async () => {
  mockedVerifyParentPin.mockResolvedValue({ status: 'authenticated' });
  renderQuiz();
  const action = requestRemoval();

  act(() => {
    renderer.root.findByType(TextInput).props.onChangeText('4831');
  });
  await act(async () => {
    await renderer.root
      .find(node => node.props.accessibilityLabel === 'Unlock and Exit')
      .props.onPress();
  });

  expect(mockedNavigation.dispatch).toHaveBeenCalledTimes(1);
  expect(mockedNavigation.dispatch).toHaveBeenCalledWith(action);
});

test('repeated back actions keep one pending action and dispatch it only once', async () => {
  mockedVerifyParentPin.mockResolvedValue({ status: 'authenticated' });
  renderQuiz();
  const firstAction = { type: 'GO_BACK', target: 'first' };
  const secondAction = { type: 'GO_BACK', target: 'second' };
  const callback =
    mockedUsePreventRemove.mock.calls[
      mockedUsePreventRemove.mock.calls.length - 1
    ][1];

  act(() => {
    callback({ data: { action: firstAction } });
    callback({ data: { action: secondAction } });
  });
  expect(renderer.root.findAllByType(Modal)).toHaveLength(1);

  act(() => {
    renderer.root.findByType(TextInput).props.onChangeText('4831');
  });
  await act(async () => {
    await renderer.root
      .find(node => node.props.accessibilityLabel === 'Unlock and Exit')
      .props.onPress();
  });

  expect(mockedNavigation.dispatch).toHaveBeenCalledTimes(1);
  expect(mockedNavigation.dispatch).toHaveBeenCalledWith(firstAction);
});

test('a stale removal action is not dispatched after the quiz route disappears', async () => {
  mockedVerifyParentPin.mockResolvedValue({ status: 'authenticated' });
  renderQuiz();
  requestRemoval();
  mockedNavigation.getState.mockReturnValue({ routes: [] });

  act(() => {
    renderer.root.findByType(TextInput).props.onChangeText('4831');
  });
  await act(async () => {
    await renderer.root
      .find(node => node.props.accessibilityLabel === 'Unlock and Exit')
      .props.onPress();
  });

  expect(mockedNavigation.dispatch).not.toHaveBeenCalled();
  expect(isRemovalPrevented()).toBe(true);
});

test('continuing during PIN verification cancels the pending authentication', async () => {
  let resolveVerification: (
    result: { status: 'authenticated' },
  ) => void = () => {};
  mockedVerifyParentPin.mockReturnValue(
    new Promise(resolve => {
      resolveVerification = resolve;
    }),
  );
  renderQuiz();
  requestRemoval();

  act(() => {
    renderer.root.findByType(TextInput).props.onChangeText('4831');
  });
  let verification: Promise<void> | undefined;
  await act(async () => {
    verification = renderer.root
      .find(node => node.props.accessibilityLabel === 'Unlock and Exit')
      .props.onPress();
    await Promise.resolve();
  });

  pressButton('Continue Quiz');
  await act(async () => {
    resolveVerification({ status: 'authenticated' });
    await verification;
  });

  expect(mockedNavigation.dispatch).not.toHaveBeenCalled();
  expect(isRemovalPrevented()).toBe(true);
});

test('completing a quiz disables protection, and a new quiz enables it again', async () => {
  renderQuiz();
  act(() => {
    for (const question of store.getState().quiz.math.questions) {
      store.dispatch(
        choose({ kind: 'math', id: question.id, answer: question.answer }),
      );
    }
  });

  for (let questionIndex = 0; questionIndex < 10; questionIndex += 1) {
    const nextButton = renderer.root.find(
      node =>
        node.props.accessibilityLabel ===
        (questionIndex === 9 ? 'Finish quiz' : 'Next question'),
    );
    act(() => nextButton.props.onPress());
  }

  expect(isRemovalPrevented()).toBe(false);
  expect(
    renderer.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Great work!'),
  ).toBe(true);

  pressButtonByText('Try a new quiz');

  expect(isRemovalPrevented()).toBe(true);
});
