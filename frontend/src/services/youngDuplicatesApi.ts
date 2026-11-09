import { apiRequest } from './httpClient';

export interface DuplicatePerson {
  id: string;
  fullName: string;
  placa: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  ageRange: string | null;
  gender: string | null;
  group: number | null;
  profileImage: string | null;
  roleName: string | null;
  consentStatus: string;
  hasPassword: boolean;
  firstLogin: boolean;
  createdAt: string | null;
  points: number;
  attendances: number;
}

export interface DuplicatePair {
  key: string;
  level: 'high' | 'medium';
  reasons: string[];
  a: DuplicatePerson;
  b: DuplicatePerson;
  suggestedTargetId: string;
  newestAt: string | null;
}

export interface MergeSummary {
  source: Omit<DuplicatePerson, 'points' | 'attendances'>;
  target: Omit<DuplicatePerson, 'points' | 'attendances'>;
  filledFields: string[];
  moves: {
    points: number;
    transactions: number;
    attendances: number;
    streaks: number;
    formResponses: number;
    consents: number;
    referrals: number;
    snapshots: number;
  };
  conflicts: {
    attendances: number;
    formResponses: number;
    birthdays: number;
    welcomeBonus: number;
    violetFlame: number;
    selfReferrals: number;
    streaks: number;
  };
  resultingPoints: number;
  resultingPlaca: string | null;
}

const parse = async <T>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    throw new Error(body?.error?.message || body?.message || 'No pudimos completar la acción');
  }
  return body?.data as T;
};

export const fetchDuplicatePairs = async () =>
  parse<DuplicatePair[]>(await apiRequest('young/duplicates'));

export const dismissDuplicatePair = async (youngAId: string, youngBId: string) =>
  parse<null>(
    await apiRequest('young/duplicates/dismiss', {
      method: 'POST',
      body: JSON.stringify({ youngAId, youngBId }),
    })
  );

export const previewYoungMerge = async (sourceId: string, targetId: string) =>
  parse<MergeSummary>(
    await apiRequest(`young/merge/preview?sourceId=${sourceId}&targetId=${targetId}`)
  );

export const mergeYoungAccounts = async (sourceId: string, targetId: string) =>
  parse<MergeSummary>(
    await apiRequest('young/merge', {
      method: 'POST',
      body: JSON.stringify({ sourceId, targetId }),
    })
  );
