import { needsConsent, resolveConsentStatus } from './consentService';
import { CURRENT_POLICY_VERSION } from '../config/privacyPolicy';

describe('consentService (funciones puras)', () => {
  it('needsConsent es true cuando no hay versión aceptada', () => {
    expect(needsConsent(null)).toBe(false); // sin usuario no aplica
    expect(needsConsent({})).toBe(true);
    expect(needsConsent({ dataConsent: { version: null } })).toBe(true);
  });

  it('needsConsent es false cuando se aceptó la versión vigente', () => {
    expect(
      needsConsent({ dataConsent: { version: CURRENT_POLICY_VERSION } })
    ).toBe(false);
  });

  it('needsConsent es true cuando se aceptó una versión anterior', () => {
    expect(needsConsent({ dataConsent: { version: '0.0.1' } })).toBe(true);
  });

  it('resolveConsentStatus distingue none / pending_reconsent / current', () => {
    expect(resolveConsentStatus({})).toBe('none');
    expect(resolveConsentStatus({ dataConsent: { version: '0.0.1' } })).toBe(
      'pending_reconsent'
    );
    expect(
      resolveConsentStatus({ dataConsent: { version: CURRENT_POLICY_VERSION } })
    ).toBe('current');
  });
});
