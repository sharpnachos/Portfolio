export const categoryOrder = ['needs', 'wants', 'save'];
export const categoryLabels = {
  needs: 'Needs',
  wants: 'Wants',
  save: 'Save'
};

export const segmentPalette = {
  needs: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd'],
  wants: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
  save: ['#22c55e', '#4ade80', '#86efac', '#bbf7d0']
};

export const createItem = (label, frequency = 'monthly', category = 'needs', assetType = 'checking account', isDebtPayment = false, linkedDebtId = null) => ({
  id: `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label,
  value: '',
  frequency,
  category,
  assetType,
  activelyContributing: false,
  balance: '',
  minimumPayment: '',
  interestRate: '',
  debtType: 'other',
  isDebtPayment,
  linkedDebtId
});

export const createContributionItem = (asset, fallbackIndex = 0) => ({
  id: `contribution-${asset.id}`,
  sourceAssetId: asset.id,
  label: asset.label || `Asset ${fallbackIndex + 1}`,
  assetType: asset.assetType || 'other',
  frequency: 'monthly',
  monthlyContribution: '',
  matchPercentage: '',
  maxMatchAchieved: false,
  deductedFromPay: false
});

export const createSavingsGoalItem = (label = 'Goal 1', priority = 1) => ({
  id: `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label,
  amountSaved: '',
  amountNeeded: '',
  priority
});

export const getContributionMultiplier = (frequency) => {
  if (frequency === 'weekly') {
    return 4;
  }

  if (frequency === 'biweekly') {
    return 2;
  }

  return 1;
};

export const sanitizeDecimalInput = (rawValue, maxDecimals = 2) => {
  const value = String(rawValue ?? '').replace(/[^0-9.]/g, '');
  const parts = value.split('.');

  if (parts.length === 1) {
    return parts[0];
  }

  const whole = parts[0];
  const decimal = parts.slice(1).join('').slice(0, maxDecimals);
  return `${whole}.${decimal}`;
};

export const parseAmount = (rawValue) => {
  if (!rawValue) {
    return 0;
  }

  const normalized = String(rawValue).replace(/[^0-9.-]/g, '');
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
};

export const getIncomeMultiplier = (frequency) => {
  if (frequency === 'weekly') {
    return 4;
  }

  if (frequency === 'biweekly') {
    return 2;
  }

  return 1;
};

export const getBudgetStatus = (actual, budget) => {
  const difference = actual - budget;

  if (Math.abs(difference) < 0.01) {
    return 'At Budget';
  }

  return difference > 0 ? 'Over Budget' : 'Under Budget';
};

export const formatPayoffTime = (months) => {
  if (!Number.isFinite(months) || months <= 0) {
    return 'Paid off';
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`;
  }

  if (remainingMonths === 0) {
    return `${years} year${years === 1 ? '' : 's'}`;
  }

  return `${years} year${years === 1 ? '' : 's'} ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`;
};

export const getPayoffMonthYear = (months) => {
  const now = new Date();
  const payoffDate = new Date(now.getFullYear(), now.getMonth() + months, 1);

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric'
  }).format(payoffDate);
};

export const getMonthYearFromOffset = (monthsOffset) => {
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthsOffset, 1);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  }).format(targetDate);
};
