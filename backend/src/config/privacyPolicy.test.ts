import {
  CURRENT_POLICY_VERSION,
  getPrivacyPolicy,
  getCurrentPolicyHash,
  isSupportedPolicyVersion,
} from './privacyPolicy';

describe('privacyPolicy config', () => {
  it('expone la versión vigente y su contenido', () => {
    const policy = getPrivacyPolicy();
    expect(policy.version).toBe(CURRENT_POLICY_VERSION);
    expect(policy.contentMarkdown.length).toBeGreaterThan(100);
    expect(policy.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('calcula un hash SHA-256 estable del contenido', () => {
    const a = getPrivacyPolicy().hash;
    const b = getCurrentPolicyHash();
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('reconoce solo versiones soportadas', () => {
    expect(isSupportedPolicyVersion(CURRENT_POLICY_VERSION)).toBe(true);
    expect(isSupportedPolicyVersion('9.9.9')).toBe(false);
  });

  it('lanza error al pedir una versión inexistente', () => {
    expect(() => getPrivacyPolicy('9.9.9')).toThrow();
  });
});
