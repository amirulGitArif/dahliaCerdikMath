import { verifyParentPin } from '../parentPin';

test('PIN verification fails closed until secure storage is configured', async () => {
  await expect(verifyParentPin('1234')).resolves.toEqual({
    status: 'not-configured',
  });
});
