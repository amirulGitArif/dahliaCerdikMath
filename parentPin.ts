export type ParentPinValidation =
  | { status: 'authenticated' }
  | { status: 'incorrect' }
  | { status: 'not-configured' };

/**
 * Fail closed until connected to Keychain/Keystore-backed PIN verification.
 * Store no plaintext PIN and return authenticated only after secure verification.
 */
export async function verifyParentPin(
  _pin: string,
): Promise<ParentPinValidation> {
  return { status: 'not-configured' };
}
