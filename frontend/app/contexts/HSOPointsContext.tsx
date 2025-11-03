import React from 'react';

export type Tier = { id: string; title: string; range: string; ptsMin: number; ptsMax: number; color: string; iconName?: string; benefits: string[] };

export const TIERS: Tier[] = [
  {
    id: 'bronze',
    title: 'Bronze',
    range: '0 - 499 pts',
    ptsMin: 0,
    ptsMax: 499,
    color: '#FDE68A',
    iconName: 'trophy',
    benefits: [
      '2% discount on all purchases',
      'Access to basic promotions',
      'Birthday bonus: +50 pts once a year'
    ]
  },
  {
    id: 'silver',
    title: 'Silver',
    range: '500 - 1499 pts',
    ptsMin: 500,
    ptsMax: 1499,
    color: '#FECACA',
    iconName: 'ribbon',
    benefits: [
      '10% OFF on Premium',
      'Free basic car wash once per quarter',
      'Early access to limited promotions',
      'Priority customer support via chat'
    ]
  },
  {
    id: 'gold',
    title: 'Gold',
    range: '1500 - 2999 pts',
    ptsMin: 1500,
    ptsMax: 2999,
    color: '#FECACA',
    iconName: 'star',
    benefits: [
      '15% OFF on Premium',
      'Free premium car wash once per month',
      'Monthly voucher ($5) for fuel',
      'Invitations to partner events'
    ]
  },
  {
    id: 'platinum',
    title: 'Platinum',
    range: '3000+ pts',
    ptsMin: 3000,
    ptsMax: 999999,
    color: '#E9D5FF',
    iconName: 'diamond',
    benefits: [
      '20% OFF on Premium',
      'Unlimited premium car washes',
      'Personal account manager',
      'Exclusive invites and partner discounts'
    ]
  },
];

type ContextShape = {
  points: number;
  setPoints: (v: number | ((prev: number) => number)) => void;
  addPoints: (delta: number) => void;
  currentTier: Tier;
  tiers: Tier[];
};

const HsoPointsContext = React.createContext<ContextShape | null>(null);

export function HsoPointsProvider({ children }: { children: React.ReactNode }) {
  const [points, setPoints] = React.useState<number>(340);

  const addPoints = React.useCallback((delta: number) => {
    setPoints((p) => Math.max(0, p + delta));
  }, []);

  const currentTier = React.useMemo(() => {
    return TIERS.slice().reverse().find(t => points >= t.ptsMin) || TIERS[0];
  }, [points]);

  const ctx: ContextShape = React.useMemo(() => ({ points, setPoints, addPoints, currentTier, tiers: TIERS }), [points, addPoints, currentTier]);

  return <HsoPointsContext.Provider value={ctx}>{children}</HsoPointsContext.Provider>;
}

export function useHsoPoints() {
  const ctx = React.useContext(HsoPointsContext);
  if (!ctx) throw new Error('useHsoPoints must be used within HsoPointsProvider');
  return ctx;
}

export default HsoPointsContext;
