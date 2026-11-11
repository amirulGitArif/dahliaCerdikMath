/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  let unmount = () => {};
  await ReactTestRenderer.act(async () => {
    const renderer = ReactTestRenderer.create(<App />);
    unmount = () => renderer.unmount();
  });
  await ReactTestRenderer.act(async () => unmount());
});
