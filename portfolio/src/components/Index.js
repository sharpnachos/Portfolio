import React, { useEffect, useMemo, useState } from 'react';
import '../styles/Index.css';
import '../styles/Onboarding.css';
import FinanceInputColumn from './finance/FinanceInputColumn';
import AboutMeColumn from './finance/AboutMeColumn';
import SavingsGoalsColumn from './finance/SavingsGoalsColumn';
import OnboardingScreens from './finance/OnboardingScreens';
import ResultsPanel from './finance/ResultsPanel';
import {
  categoryOrder,
  categoryLabels,
  segmentPalette,
  createItem,
  createContributionItem,
  createSavingsGoalItem,
  sanitizeDecimalInput,
  parseAmount,
  getIncomeMultiplier,
  getContributionMultiplier,
  getBudgetStatus,
  formatPayoffTime,
  getPayoffMonthYear,
  getMonthYearFromOffset
} from './finance/financeHelpers';

const ALL_STEP_KEYS = ['income', 'assets', 'contributions', 'expenses', 'debt', 'savings-goals', 'about-me'];

function Index() {
  const [incomeFields, setIncomeFields] = useState([createItem('Primary Paycheck', 'biweekly')]);
  const [assetFields, setAssetFields] = useState([createItem('Primary Account', 'monthly', 'needs', 'checking account')]);
  const [expenseFields, setExpenseFields] = useState([
    createItem('Rent'),
    createItem('Groceries'),
    createItem('Transportation'),
    createItem('Utilities'),
    createItem('Insurance')
  ]);
  const [debtFields, setDebtFields] = useState([createItem('Debt 1')]);
  const [contributionFields, setContributionFields] = useState([]);
  const [savingsGoalFields, setSavingsGoalFields] = useState([createSavingsGoalItem('Goal 1', 1)]);
  const [editingItemId, setEditingItemId] = useState(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [calculationResult, setCalculationResult] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [dismissedWarnings, setDismissedWarnings] = useState([]);
  const [payoffMethod, setPayoffMethod] = useState('snowball');
  const [additionalDebtPayment, setAdditionalDebtPayment] = useState(0);
  const [rolloverPaidOffMinimums, setRolloverPaidOffMinimums] = useState(true);
  const [selectedPayoffPhaseKey, setSelectedPayoffPhaseKey] = useState(null);
  const [selectedNetWorthSegment, setSelectedNetWorthSegment] = useState(null);
  const [retirementRateOfReturn, setRetirementRateOfReturn] = useState(7);
  const [activeAmountField, setActiveAmountField] = useState(null);
  const [activeRateField, setActiveRateField] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [showHelpChooser, setShowHelpChooser] = useState(false);
  const [showHousingChooser, setShowHousingChooser] = useState(false);
  const [selectedHelpOptions, setSelectedHelpOptions] = useState([]);
  const [hasManualMaritalStatus, setHasManualMaritalStatus] = useState(false);
  const [housingInfo, setHousingInfo] = useState({
    occupancy: 'rent',
    rentAmount: '',
    mortgageBalance: '',
    mortgageInterestRate: '',
    monthlyMortgagePayment: '',
    homeEquity: '',
    homePaidOff: false
  });
  const [aboutMe, setAboutMe] = useState({
    age: '',
    maritalStatus: 'single',
    lowestDeductible: '',
    hasHighDeductiblePlan: false
  });

  useEffect(() => {
    const contributingAssets = assetFields.filter((asset) => asset.activelyContributing);

    setContributionFields((previous) => {
      const previousByAssetId = new Map(previous.map((item) => [item.sourceAssetId, item]));

      return contributingAssets.map((asset, index) => {
        const existing = previousByAssetId.get(asset.id);

        if (existing) {
          return {
            ...existing,
            label: asset.label || `Asset ${index + 1}`,
            assetType: asset.assetType || 'other'
          };
        }

        return createContributionItem(asset, index);
      });
    });
  }, [assetFields]);

  useEffect(() => {
    if (hasManualMaritalStatus) {
      return;
    }

    const defaultMaritalStatus = incomeFields.length > 1 ? 'married' : 'single';
    setAboutMe((previous) => ({
      ...previous,
      maritalStatus: defaultMaritalStatus
    }));
  }, [incomeFields.length, hasManualMaritalStatus]);

  // Sync debt minimum payments to expense fields
  useEffect(() => {
    setExpenseFields((previous) => {
      // Get all non-debt expenses
      const nonDebtExpenses = previous.filter((expense) => !expense.isDebtPayment);
      
      // Create debt payment expenses from current debt fields
      const debtPaymentExpenses = debtFields
        .filter((debt) => parseAmount(debt.balance) > 0 && parseAmount(debt.minimumPayment) > 0)
        .map((debt, index) => {
          // Check if we already have this debt expense
          const existing = previous.find((expense) => expense.linkedDebtId === debt.id);
          
          if (existing) {
            // Update existing debt expense
            return {
              ...existing,
              label: `${debt.label || `Debt ${index + 1}`} Payment`,
              value: String(parseAmount(debt.minimumPayment))
            };
          }
          
          // Create new debt expense
          return {
            ...createItem(`${debt.label || `Debt ${index + 1}`} Payment`, 'monthly', 'needs', 'checking account', true, debt.id),
            value: String(parseAmount(debt.minimumPayment))
          };
        });
      
      return [...nonDebtExpenses, ...debtPaymentExpenses];
    });
  }, [debtFields]);

  const formatCurrency = (value) => (
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  );

  const formatCurrencyDisplay = (rawValue) => {
    if (!rawValue) {
      return '';
    }

    return formatCurrency(parseAmount(rawValue));
  };

  const formatPercentDisplay = (rawValue) => {
    if (!rawValue) {
      return '';
    }

    return `${parseAmount(rawValue).toFixed(2)}%`;
  };

  const payoffData = useMemo(() => {
    const preparedDebts = debtFields
      .map((debt, index) => ({
        id: debt.id,
        label: debt.label || `Debt ${index + 1}`,
        balance: Math.max(parseAmount(debt.balance), 0),
        minimumPayment: Math.max(parseAmount(debt.minimumPayment), 0),
        annualRate: Math.max(parseAmount(debt.interestRate), 0)
      }))
      .filter((debt) => debt.balance > 0);

    if (preparedDebts.length === 0) {
      return {
        debts: [],
        phases: [],
        totalPhaseMonths: 0
      };
    }

    const sortByMethod = (items) => {
      if (payoffMethod === 'avalanche') {
        return [...items].sort((a, b) => {
          if (b.annualRate !== a.annualRate) {
            return b.annualRate - a.annualRate;
          }

          return a.balance - b.balance;
        });
      }

      return [...items].sort((a, b) => {
        if (a.balance !== b.balance) {
          return a.balance - b.balance;
        }

        return b.annualRate - a.annualRate;
      });
    };

    const orderedDebts = sortByMethod(preparedDebts).map((debt) => ({
      ...debt,
      remainingBalance: debt.balance,
      payoffMonth: null
    }));

    const baselineDebtPayment = orderedDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0) + additionalDebtPayment;
    const maxMonths = 1200;
    const epsilon = 0.005;
    const monthlyPriorityLog = [];

    for (let month = 1; month <= maxMonths; month += 1) {
      const activeDebts = orderedDebts.filter((debt) => debt.remainingBalance > epsilon);

      if (activeDebts.length === 0) {
        break;
      }

      activeDebts.forEach((debt) => {
        const monthlyRate = debt.annualRate / 100 / 12;
        if (monthlyRate > 0) {
          debt.remainingBalance += debt.remainingBalance * monthlyRate;
        }
      });

      let minimumPaidThisMonth = 0;
      activeDebts.forEach((debt) => {
        const minimumDue = Math.min(debt.minimumPayment, debt.remainingBalance);
        debt.remainingBalance -= minimumDue;
        minimumPaidThisMonth += minimumDue;

        if (debt.remainingBalance <= epsilon && debt.payoffMonth === null) {
          debt.remainingBalance = 0;
          debt.payoffMonth = month;
        }
      });

      let rolloverBudget = rolloverPaidOffMinimums
        ? Math.max(baselineDebtPayment - minimumPaidThisMonth, 0)
        : Math.max(additionalDebtPayment, 0);
      const priorityDebts = sortByMethod(orderedDebts).filter((debt) => debt.remainingBalance > epsilon);

      if (priorityDebts.length > 0) {
        monthlyPriorityLog.push({
          month,
          targetDebtId: priorityDebts[0].id,
          targetDebtLabel: priorityDebts[0].label,
          annualRate: priorityDebts[0].annualRate,
          minimumPayment: priorityDebts[0].minimumPayment,
          extraPayment: 0
        });
      }

      for (let index = 0; index < priorityDebts.length && rolloverBudget > 0; index += 1) {
        const debt = priorityDebts[index];
        const extraPayment = Math.min(rolloverBudget, debt.remainingBalance);
        debt.remainingBalance -= extraPayment;
        rolloverBudget -= extraPayment;

        if (index === 0 && monthlyPriorityLog.length > 0 && monthlyPriorityLog[monthlyPriorityLog.length - 1].month === month) {
          monthlyPriorityLog[monthlyPriorityLog.length - 1].extraPayment += extraPayment;
        }

        if (debt.remainingBalance <= epsilon && debt.payoffMonth === null) {
          debt.remainingBalance = 0;
          debt.payoffMonth = month;
        }
      }
    }

    const debts = sortByMethod(orderedDebts).map((debt) => ({
      ...debt,
      payoffText: debt.payoffMonth ? formatPayoffTime(debt.payoffMonth) : 'More than 100 years'
    }));

    const phases = [];
    monthlyPriorityLog.forEach((entry) => {
      const totalPayment = entry.minimumPayment + entry.extraPayment;
      const lastPhase = phases[phases.length - 1];

      if (
        lastPhase
        && lastPhase.targetDebtId === entry.targetDebtId
      ) {
        lastPhase.endMonth = entry.month;
        lastPhase.months += 1;
        lastPhase.totalPayment = totalPayment;
        lastPhase.extraPaymentTotal += entry.extraPayment;
      } else {
        phases.push({
          key: `${entry.targetDebtId}-${entry.month}`,
          targetDebtId: entry.targetDebtId,
          targetDebtLabel: entry.targetDebtLabel,
          annualRate: entry.annualRate,
          minimumPayment: entry.minimumPayment,
          extraPayment: entry.extraPayment,
          totalPayment,
          startMonth: entry.month,
          endMonth: entry.month,
          months: 1,
          extraPaymentTotal: entry.extraPayment
        });
      }
    });

    const totalPhaseMonths = phases.reduce((sum, phase) => sum + phase.months, 0);
    const phasesWithWidth = phases.map((phase) => ({
      ...phase,
      averageExtraPayment: phase.months > 0 ? phase.extraPaymentTotal / phase.months : 0,
      widthPercent: totalPhaseMonths > 0 ? (phase.months / totalPhaseMonths) * 100 : 0
    }));

    return {
      debts,
      phases: phasesWithWidth,
      totalPhaseMonths
    };
  }, [debtFields, payoffMethod, additionalDebtPayment, rolloverPaidOffMinimums]);

  const payoffTimeline = payoffData.debts;
  const payoffPhases = payoffData.phases;

  const totalDebtPayoffSummary = useMemo(() => {
    if (payoffTimeline.length === 0) {
      return null;
    }

    const hasUnresolvedDebts = payoffTimeline.some((debt) => debt.payoffMonth === null);
    if (hasUnresolvedDebts) {
      return {
        totalTime: 'More than 100 years',
        paidOffBy: 'Not within projection window'
      };
    }

    const maxPayoffMonth = payoffTimeline.reduce((latest, debt) => {
      return Math.max(latest, debt.payoffMonth || 0);
    }, 0);

    return {
      totalTime: formatPayoffTime(maxPayoffMonth),
      paidOffBy: getPayoffMonthYear(maxPayoffMonth)
    };
  }, [payoffTimeline]);

  const payoffTimelineStartLabel = getMonthYearFromOffset(0);
  const payoffTimelineEndLabel = totalDebtPayoffSummary && totalDebtPayoffSummary.paidOffBy !== 'Not within projection window'
    ? totalDebtPayoffSummary.paidOffBy
    : 'Open End';

  const maxAdditionalDebtPayment = calculationResult
    ? Math.max(0, Math.floor(calculationResult.monthlyIncome - calculationResult.totalExpenses))
    : 0;

  const netWorthData = useMemo(() => {
    const assets = assetFields
      .map((asset, index) => ({
        id: asset.id,
        label: asset.label || `Asset ${index + 1}`,
        type: asset.assetType || 'other',
        amount: Math.max(parseAmount(asset.value), 0)
      }))
      .filter((asset) => asset.amount > 0);

    const debts = debtFields
      .map((debt, index) => ({
        id: debt.id,
        label: debt.label || `Debt ${index + 1}`,
        amount: Math.max(parseAmount(debt.balance), 0),
        minimumPayment: Math.max(parseAmount(debt.minimumPayment), 0),
        annualRate: Math.max(parseAmount(debt.interestRate), 0)
      }))
      .filter((debt) => debt.amount > 0);

    const totalAssets = assets.reduce((sum, asset) => sum + asset.amount, 0);
    const totalDebts = debts.reduce((sum, debt) => sum + debt.amount, 0);
    const maxMagnitude = Math.max(totalAssets, totalDebts, 0);

    const assetsWithWidth = assets.map((asset) => ({
      ...asset,
      segmentPercent: totalAssets > 0 ? (asset.amount / totalAssets) * 100 : 0
    }));

    const debtsWithWidth = debts.map((debt) => ({
      ...debt,
      segmentPercent: totalDebts > 0 ? (debt.amount / totalDebts) * 100 : 0
    }));

    const scalePercentAssets = maxMagnitude > 0 ? (totalAssets / maxMagnitude) * 100 : 0;
    const scalePercentDebts = maxMagnitude > 0 ? (totalDebts / maxMagnitude) * 100 : 0;

    return {
      totalAssets,
      totalDebts,
      netWorth: totalAssets - totalDebts,
      maxMagnitude,
      scalePercentAssets,
      scalePercentDebts,
      assets: assetsWithWidth,
      debts: debtsWithWidth
    };
  }, [assetFields, debtFields]);

  const guidelines = useMemo(() => {
    if (!calculationResult) {
      return [];
    }

    const monthlyIncome = calculationResult.monthlyIncome;
    const needsSummary = calculationResult.categorySummaries.find((item) => item.category === 'needs');
    const monthlyNeeds = needsSummary ? needsSummary.actual : 0;
    const sixMonthNeeds = monthlyNeeds * 6;

    const totalSavingsAccounts = assetFields
      .filter((asset) => (asset.assetType || '').toLowerCase() === 'savings account')
      .reduce((sum, asset) => sum + Math.max(parseAmount(asset.value), 0), 0);

    const totalCheckingAccounts = assetFields
      .filter((asset) => (asset.assetType || '').toLowerCase() === 'checking account')
      .reduce((sum, asset) => sum + Math.max(parseAmount(asset.value), 0), 0);

    const totalRent = expenseFields
      .filter((expense) => (expense.label || '').toLowerCase().includes('rent'))
      .reduce((sum, expense) => sum + Math.max(parseAmount(expense.value), 0), 0);

    const totalCarPayment = expenseFields
      .filter((expense) => {
        const label = (expense.label || '').toLowerCase();
        return label.includes('car payment') || label.includes('auto payment');
      })
      .reduce((sum, expense) => sum + Math.max(parseAmount(expense.value), 0), 0);

    const totalAutoLoanMinimumPayment = debtFields
      .filter((debt) => (debt.debtType || '').toLowerCase() === 'auto loan')
      .reduce((sum, debt) => sum + Math.max(parseAmount(debt.minimumPayment), 0), 0);

    const carLimitCheckAmount = totalAutoLoanMinimumPayment > 0
      ? totalAutoLoanMinimumPayment
      : totalCarPayment;
    const carLimitSourceText = totalAutoLoanMinimumPayment > 0
      ? 'Auto loan minimum payments'
      : 'Car payment expenses';

    const rentLow = monthlyIncome * 0.25;
    const rentHigh = monthlyIncome * 0.33;
    const carLimit = monthlyIncome * 0.08;

    return [
      {
        id: 'savings-needs-6x',
        label: 'Savings accounts should be at least 6x monthly needs.',
        detail: `${formatCurrency(totalSavingsAccounts)} vs required ${formatCurrency(sixMonthNeeds)}`,
        passed: totalSavingsAccounts >= sixMonthNeeds
      },
      {
        id: 'checking-needs-band',
        label: 'Checking account balance',
        detail: `Your checking account should have between 1x and 2x your monthly needs. You have ${formatCurrency(totalCheckingAccounts)}. Recommended: ${formatCurrency(monthlyNeeds)} - ${formatCurrency(monthlyNeeds * 2)}.`,
        passed: totalCheckingAccounts >= monthlyNeeds && totalCheckingAccounts <= (monthlyNeeds * 2)
      },
      {
        id: 'rent-budget-band',
        label: 'Rent budget',
        detail: `Your rent should be between 25% and 33% of your monthly income, or less. Your rent: ${formatCurrency(totalRent)}. Recommended: ${formatCurrency(rentLow)} - ${formatCurrency(rentHigh)} or less.`,
        passed: totalRent <= rentHigh
      },
      {
        id: 'car-budget-cap',
        label: 'Car payment budget',
        detail: `Your car payment should be 8% or less of your monthly income. Your payment: ${formatCurrency(carLimitCheckAmount)}. Recommended: ${formatCurrency(carLimit)} or less.`,
        passed: carLimitCheckAmount <= carLimit
      }
    ];
  }, [assetFields, expenseFields, debtFields, calculationResult]);

  const updateFieldValue = (setter, values, index, newValue) => {
    const nextValues = [...values];
    nextValues[index] = {
      ...nextValues[index],
      value: sanitizeDecimalInput(newValue)
    };
    setter(nextValues);
  };

  const updateFieldAmountByKey = (setter, values, index, key, newValue) => {
    const nextValues = [...values];
    nextValues[index] = {
      ...nextValues[index],
      [key]: sanitizeDecimalInput(newValue)
    };
    setter(nextValues);
  };

  const updateFieldFrequency = (setter, values, index, newFrequency) => {
    const nextValues = [...values];
    nextValues[index] = {
      ...nextValues[index],
      frequency: newFrequency
    };
    setter(nextValues);
  };

  const updateFieldCategory = (setter, values, index, newCategory) => {
    const nextValues = [...values];
    nextValues[index] = {
      ...nextValues[index],
      category: newCategory
    };
    setter(nextValues);
  };

  const updateDebtField = (setter, values, index, key, newValue) => {
    const nextValues = [...values];
    nextValues[index] = {
      ...nextValues[index],
      [key]: newValue
    };
    setter(nextValues);
  };

  const updateAssetField = (setter, values, index, key, newValue) => {
    const nextValues = [...values];
    nextValues[index] = {
      ...nextValues[index],
      [key]: newValue
    };
    setter(nextValues);
  };

  const updateAssetType = (setter, values, index, newAssetType) => {
    const nextValues = [...values];
    nextValues[index] = {
      ...nextValues[index],
      assetType: newAssetType
    };
    setter(nextValues);
  };

  const updateFieldBooleanByKey = (setter, values, index, key, newValue) => {
    const nextValues = [...values];
    nextValues[index] = {
      ...nextValues[index],
      [key]: Boolean(newValue)
    };
    setter(nextValues);
  };

  const addField = (title, setter, values) => {
    const nextLabel = `${title} ${values.length + 1}`;

    if (title === 'Income') {
      setter([...values, createItem(nextLabel, 'biweekly')]);
      return;
    }

    if (title === 'Assets') {
      setter([...values, createItem(nextLabel, 'monthly', 'needs', 'checking account')]);
      return;
    }

    setter([...values, createItem(nextLabel)]);
  };

  const removeField = (setter, values, index) => {
    if (values.length === 1) {
      return;
    }

    // Prevent deletion of debt payment expenses
    const item = values[index];
    if (item && item.isDebtPayment) {
      return;
    }

    setter(values.filter((_, itemIndex) => itemIndex !== index));
  };

  const startEditingLabel = (item) => {
    setEditingItemId(item.id);
    setDraftLabel(item.label);
  };

  const saveEditingLabel = (setter, values, index) => {
    const trimmedLabel = draftLabel.trim();

    if (!trimmedLabel) {
      setEditingItemId(null);
      setDraftLabel('');
      return;
    }

    const nextValues = [...values];
    nextValues[index] = {
      ...nextValues[index],
      label: trimmedLabel
    };

    setter(nextValues);
    setEditingItemId(null);
    setDraftLabel('');
  };

  const cancelEditingLabel = () => {
    setEditingItemId(null);
    setDraftLabel('');
  };

  const dismissWarning = (warningKey) => {
    setDismissedWarnings((previous) => [...previous, warningKey]);
  };

  const updateAboutMeField = (key, value) => {
    if (key === 'maritalStatus') {
      setHasManualMaritalStatus(true);
    }

    setAboutMe((previous) => ({
      ...previous,
      [key]: value
    }));
  };

  const helpOptions = [
    'Find my net worth',
    'Pay off my debt',
    'Create a budget',
    'Show me my next financial step',
    'Help me save for a goal',
    'I want all of it!'
  ];
  const allOptionLabel = 'I want all of it!';
  const nextStepOptionLabel = 'Show me my next financial step';
  const netWorthOptionLabel = 'Find my net worth';
  const debtOptionLabel = 'Pay off my debt';
  const budgetOptionLabel = 'Create a budget';
  const saveGoalOptionLabel = 'Help me save for a goal';

  const selectedHelpOptionSet = useMemo(() => new Set(selectedHelpOptions), [selectedHelpOptions]);
  const wantsAllExperience = selectedHelpOptionSet.has(allOptionLabel) || selectedHelpOptionSet.has(nextStepOptionLabel);

  const enabledInputStepKeys = useMemo(() => {
    if (wantsAllExperience) {
      return new Set(ALL_STEP_KEYS);
    }

    const nextKeys = new Set();

    if (selectedHelpOptionSet.has(netWorthOptionLabel)) {
      nextKeys.add('assets');
      nextKeys.add('debt');
    }

    if (selectedHelpOptionSet.has(debtOptionLabel)) {
      nextKeys.add('debt');
    }

    if (selectedHelpOptionSet.has(budgetOptionLabel)) {
      nextKeys.add('income');
      nextKeys.add('expenses');
    }

    if (selectedHelpOptionSet.has(saveGoalOptionLabel)) {
      nextKeys.add('income');
      nextKeys.add('savings-goals');
    }

    if (nextKeys.size === 0) {
      nextKeys.add('income');
    }

    return nextKeys;
  }, [wantsAllExperience, selectedHelpOptionSet]);

  const showBudgetResults = wantsAllExperience || selectedHelpOptionSet.has(budgetOptionLabel) || selectedHelpOptionSet.has(saveGoalOptionLabel);
  const showDebtResults = wantsAllExperience || selectedHelpOptionSet.has(debtOptionLabel);
  const showNetWorthResults = wantsAllExperience || selectedHelpOptionSet.has(netWorthOptionLabel);
  const showGuidelinesResults = wantsAllExperience;
  const showRetirementResults = wantsAllExperience || selectedHelpOptionSet.has(budgetOptionLabel) || selectedHelpOptionSet.has(saveGoalOptionLabel);

  const allInputSteps = [
    {
      key: 'income',
      title: 'Income',
      values: incomeFields,
      setter: setIncomeFields,
      prefix: 'income',
      addText: 'Add Income'
    },
    {
      key: 'assets',
      title: 'Assets',
      values: assetFields,
      setter: setAssetFields,
      prefix: 'asset',
      addText: 'Add Asset'
    },
    {
      key: 'debt',
      title: 'Debt',
      values: debtFields,
      setter: setDebtFields,
      prefix: 'debt',
      addText: 'Add Debt'
    },
    {
      key: 'contributions',
      title: 'Contributions',
      values: contributionFields,
      setter: setContributionFields,
      prefix: 'contribution',
      addText: 'Add Contribution'
    },
    {
      key: 'expenses',
      title: 'Expenses',
      values: expenseFields,
      setter: setExpenseFields,
      prefix: 'expense',
      addText: 'Add Expense'
    },
    {
      key: 'savings-goals',
      title: 'Savings Goals',
      values: savingsGoalFields,
      setter: setSavingsGoalFields,
      prefix: 'savings-goal',
      addText: 'Add Goal'
    },
    {
      key: 'about-me',
      title: 'About Me',
      values: [],
      setter: () => {},
      prefix: 'about-me',
      addText: ''
    }
  ];

  const activeInputSteps = allInputSteps.filter((step) => enabledInputStepKeys.has(step.key));
  const currentStep = activeInputSteps[activeStep] || activeInputSteps[0] || null;

  useEffect(() => {
    const maxStepIndex = Math.max(activeInputSteps.length - 1, 0);

    if (activeStep > maxStepIndex) {
      setActiveStep(maxStepIndex);
    }

    setMaxUnlockedStep((previous) => Math.min(previous, maxStepIndex));
  }, [activeInputSteps.length, activeStep]);

  const handleNextStep = () => {
    if (activeStep >= activeInputSteps.length - 1) {
      handleCalculate();
      return;
    }

    const nextStep = activeStep + 1;
    setActiveStep(nextStep);
    setMaxUnlockedStep((previous) => Math.max(previous, nextStep));
  };

  const handlePreviousStep = () => {
    if (activeStep === 0) {
      return;
    }

    setActiveStep(activeStep - 1);
  };

  const handleStepDotClick = (stepIndex) => {
    if (stepIndex > maxUnlockedStep) {
      return;
    }

    setActiveStep(stepIndex);
  };

  const handleCalculate = () => {
    const totalMonthlyContributions = contributionFields.reduce((sum, item) => {
      const contributionAmount = parseAmount(item.monthlyContribution);
      return sum + (contributionAmount * getContributionMultiplier(item.frequency));
    }, 0);

    const totalDeductedContributions = contributionFields.reduce((sum, item) => {
      if (item.deductedFromPay) {
        const contributionAmount = parseAmount(item.monthlyContribution);
        return sum + (contributionAmount * getContributionMultiplier(item.frequency));
      }
      return sum;
    }, 0);

    const monthlyIncome = incomeFields.reduce((sum, item) => {
      const amount = parseAmount(item.value);
      return sum + (amount * getIncomeMultiplier(item.frequency));
    }, 0) + totalDeductedContributions;

    const totalMinimumDebtPayments = debtFields.reduce((sum, item) => {
      return sum + parseAmount(item.minimumPayment);
    }, 0);

    const budgetByCategory = {
      needs: monthlyIncome * 0.5,
      wants: monthlyIncome * 0.3,
      save: monthlyIncome * 0.2
    };

    const expenseItemsByCategory = expenseFields.reduce((groups, item) => {
      const category = categoryOrder.includes(item.category) ? item.category : 'needs';
      const amount = parseAmount(item.value);

      if (amount <= 0) {
        return groups;
      }

      return {
        ...groups,
        [category]: [
          ...groups[category],
          {
            id: item.id,
            label: item.label,
            amount
          }
        ]
      };
    }, {
      needs: [],
      wants: [],
      save: []
    });

    if (totalMonthlyContributions > 0) {
      expenseItemsByCategory.save = [
        ...expenseItemsByCategory.save,
        {
          id: 'auto-monthly-contributions',
          label: 'Contributions',
          amount: totalMonthlyContributions
        }
      ];
    }

    const expenseByCategory = categoryOrder.reduce((totals, category) => {
      const categoryTotal = expenseItemsByCategory[category].reduce((sum, entry) => sum + entry.amount, 0);

      return {
        ...totals,
        [category]: categoryTotal
      };
    }, {
      needs: 0,
      wants: 0,
      save: 0
    });

    const categorySummaries = categoryOrder.map((category) => {
      const budget = budgetByCategory[category];
      const actual = expenseByCategory[category];
      const difference = actual - budget;
      const fillPercent = budget > 0
        ? Math.min((actual / budget) * 100, 100)
        : (actual > 0 ? 100 : 0);
      const remainingBudget = Math.max(budget - actual, 0);
      const remainingPercentOfBudget = budget > 0 ? (remainingBudget / budget) * 100 : 0;
      const remainingPercentOfIncome = monthlyIncome > 0 ? (remainingBudget / monthlyIncome) * 100 : 0;

      const itemSegments = expenseItemsByCategory[category].map((entry, index) => {
        const percentOfBudget = budget > 0 ? (entry.amount / budget) * 100 : 0;
        const percentOfIncome = monthlyIncome > 0 ? (entry.amount / monthlyIncome) * 100 : 0;
        const widthPercent = actual > 0 ? (entry.amount / actual) * fillPercent : 0;

        return {
          ...entry,
          percentOfBudget,
          percentOfIncome,
          widthPercent,
          color: segmentPalette[category][index % segmentPalette[category].length],
          hoverText: `${entry.label}: ${formatCurrency(entry.amount)} (${budget > 0 ? percentOfBudget.toFixed(1) : '0.0'}% of ${categoryLabels[category]} budget, ${percentOfIncome.toFixed(1)}% of total income)`
        };
      });

      const remainingSegment = remainingBudget > 0
        ? {
          id: `${category}-remaining-budget`,
          label: 'Remaining Budget',
          amount: remainingBudget,
          percentOfBudget: remainingPercentOfBudget,
          percentOfIncome: remainingPercentOfIncome,
          widthPercent: 100 - fillPercent,
          hoverText: `${categoryLabels[category]} remaining: ${formatCurrency(remainingBudget)} (${remainingPercentOfBudget.toFixed(1)}% of ${categoryLabels[category]} budget, ${remainingPercentOfIncome.toFixed(1)}% of total income)`
        }
        : null;

      return {
        category,
        label: categoryLabels[category],
        budget,
        actual,
        remainingBudget,
        difference,
        status: getBudgetStatus(actual, budget),
        itemSegments,
        remainingSegment
      };
    });

    const summaryByCategory = categorySummaries.reduce((map, item) => ({
      ...map,
      [item.category]: item
    }), {});
    const warnings = [];

    const needsSummary = summaryByCategory.needs;
    if (needsSummary && needsSummary.budget > 0 && needsSummary.actual > needsSummary.budget * 1.05) {
      const percentOver = ((needsSummary.actual / needsSummary.budget) - 1) * 100;
      warnings.push(`Needs spending is ${percentOver.toFixed(1)}% over budget.`);
    }

    const wantsSummary = summaryByCategory.wants;
    if (wantsSummary && wantsSummary.budget > 0 && wantsSummary.actual > wantsSummary.budget * 1.05) {
      const percentOver = ((wantsSummary.actual / wantsSummary.budget) - 1) * 100;
      warnings.push(`Wants spending is ${percentOver.toFixed(1)}% over budget.`);
    }

    const savingsSummary = summaryByCategory.save;
    if (savingsSummary && savingsSummary.budget > 0 && savingsSummary.actual < savingsSummary.budget) {
      warnings.push(`Savings is below target by ${formatCurrency(savingsSummary.budget - savingsSummary.actual)}.`);
    }

    const totalExpenses = categorySummaries.reduce((sum, item) => sum + item.actual, 0);
    const remainingAfterExpenses = monthlyIncome - totalExpenses;
    const addlDebtPaymentSum = expenseFields
      .filter((item) => item.category === 'save' && item.addlDebtPayment)
      .reduce((sum, item) => sum + parseAmount(item.value), 0);

    // Retirement tracking calculations
    const userAge = parseAmount(aboutMe.age);
    const retirementAccounts = assetFields.filter((asset) => 
      (asset.assetType || '').toLowerCase() === 'retirement account'
    );
    
    const totalRetirementBalance = retirementAccounts.reduce((sum, asset) => 
      sum + parseAmount(asset.value), 0
    );

    const retirementContributions = contributionFields.filter((contribution) => 
      (contribution.assetType || '').toLowerCase() === 'retirement account'
    );

    const monthlyRetirementContribution = retirementContributions.reduce((sum, contribution) => {
      const contributionAmount = parseAmount(contribution.monthlyContribution);
      const monthlyAmount = contributionAmount * getContributionMultiplier(contribution.frequency);
      const matchPercent = parseAmount(contribution.matchPercentage);
      const employerMatch = contribution.maxMatchAchieved ? 0 : (monthlyAmount * matchPercent / 100);
      return sum + monthlyAmount + employerMatch;
    }, 0);

    // Determine retirement target based on age
    let retirementTargetMultiplier = 0;
    let nextMilestoneAge = 30;
    let nextMilestoneMultiplier = 1;
    
    if (userAge >= 60) {
      retirementTargetMultiplier = 9;
      nextMilestoneAge = 67;
      nextMilestoneMultiplier = 10;
    } else if (userAge >= 50) {
      retirementTargetMultiplier = 6;
      nextMilestoneAge = 60;
      nextMilestoneMultiplier = 9;
    } else if (userAge >= 40) {
      retirementTargetMultiplier = 3;
      nextMilestoneAge = 50;
      nextMilestoneMultiplier = 6;
    } else if (userAge >= 30) {
      retirementTargetMultiplier = 1;
      nextMilestoneAge = 40;
      nextMilestoneMultiplier = 3;
    } else {
      retirementTargetMultiplier = 0;
      nextMilestoneAge = 30;
      nextMilestoneMultiplier = 1;
    }

    const annualIncome = monthlyIncome * 12;
    const retirementTarget = annualIncome * retirementTargetMultiplier;
    const nextMilestoneTarget = annualIncome * nextMilestoneMultiplier;
    const isOnTrack = totalRetirementBalance >= retirementTarget;
    const percentOfTarget = retirementTarget > 0 ? (totalRetirementBalance / retirementTarget) * 100 : 0;

    // Calculate future value projection at age 65
    const yearsToRetirement = Math.max(0, 65 - userAge);
    const monthsToRetirement = yearsToRetirement * 12;
    const monthlyRate = retirementRateOfReturn / 100 / 12;
    
    let projectedRetirementValue = totalRetirementBalance;
    
    if (monthsToRetirement > 0 && monthlyRetirementContribution > 0) {
      // Future value of current balance
      const futureValueOfBalance = totalRetirementBalance * Math.pow(1 + monthlyRate, monthsToRetirement);
      
      // Future value of monthly contributions (annuity)
      const futureValueOfContributions = monthlyRate > 0
        ? monthlyRetirementContribution * ((Math.pow(1 + monthlyRate, monthsToRetirement) - 1) / monthlyRate)
        : monthlyRetirementContribution * monthsToRetirement;
      
      projectedRetirementValue = futureValueOfBalance + futureValueOfContributions;
    } else if (monthsToRetirement > 0) {
      projectedRetirementValue = totalRetirementBalance * Math.pow(1 + monthlyRate, monthsToRetirement);
    }

    const retirementTracking = {
      currentAge: userAge,
      totalRetirementBalance,
      monthlyRetirementContribution,
      retirementTarget,
      retirementTargetMultiplier,
      nextMilestoneAge,
      nextMilestoneTarget,
      nextMilestoneMultiplier,
      isOnTrack,
      percentOfTarget,
      yearsToRetirement,
      projectedRetirementValue,
      rateOfReturn: retirementRateOfReturn,
      annualIncome
    };

    setCalculationResult({
      monthlyIncome,
      totalExpenses,
      categorySummaries,
      warnings,
      retirementTracking
    });
    setAdditionalDebtPayment(Math.max(100, addlDebtPaymentSum));
    setPayoffMethod('snowball');
    setRolloverPaidOffMinimums(true);
    setDismissedWarnings([]);
    setSelectedSegment(null);
    setSelectedPayoffPhaseKey(null);
    setSelectedNetWorthSegment(null);
    setMaxUnlockedStep(activeInputSteps.length - 1);
    setFormCollapsed(true);
  };

  const handleHelpOptionToggle = (option) => {
    setSelectedHelpOptions((previous) => {
      const isSelected = previous.includes(option);

      if (option === allOptionLabel) {
        return isSelected ? [] : [allOptionLabel];
      }

      if (previous.includes(allOptionLabel)) {
        return [option];
      }

      if (isSelected) {
        return previous.filter((item) => item !== option);
      }

      return [...previous, option];
    });
  };

  const handleHelpChooserContinue = () => {
    if (selectedHelpOptions.length === 0) {
      return;
    }

    setShowHelpChooser(false);
    setShowHousingChooser(true);
  };

  const updateHousingInfo = (key, rawValue) => {
    const nextValue = key === 'occupancy' ? rawValue : sanitizeDecimalInput(rawValue);

    setHousingInfo((previous) => ({
      ...previous,
      [key]: nextValue,
      ...(key === 'occupancy' && rawValue === 'rent'
        ? {
          mortgageBalance: '',
          mortgageInterestRate: '',
          monthlyMortgagePayment: '',
          homeEquity: '',
          homePaidOff: false
        }
        : {}),
      ...(key === 'occupancy' && rawValue === 'own'
        ? { rentAmount: '' }
        : {})
    }));
  };

  const handleHousingPaidOffToggle = (checked) => {
    setHousingInfo((previous) => ({
      ...previous,
      homePaidOff: Boolean(checked),
      ...(checked
        ? {
          mortgageBalance: '',
          mortgageInterestRate: '',
          monthlyMortgagePayment: '',
          homeEquity: ''
        }
        : {})
    }));
  };

  const canContinueHousing = useMemo(() => {
    if (housingInfo.occupancy === 'rent') {
      return parseAmount(housingInfo.rentAmount) > 0;
    }

    if (housingInfo.homePaidOff) {
      return true;
    }

    return [
      housingInfo.mortgageBalance,
      housingInfo.mortgageInterestRate,
      housingInfo.monthlyMortgagePayment,
      housingInfo.homeEquity
    ].every((value) => String(value || '').trim() !== '');
  }, [housingInfo]);

  const handleHousingContinue = () => {
    if (!canContinueHousing) {
      return;
    }

    const isRenting = housingInfo.occupancy === 'rent';
    const rentAmount = housingInfo.rentAmount;
    const mortgageBalance = housingInfo.mortgageBalance;
    const mortgageInterestRate = housingInfo.mortgageInterestRate;
    const monthlyMortgagePayment = housingInfo.monthlyMortgagePayment;
    const homeEquity = housingInfo.homeEquity;
    const homePaidOff = housingInfo.homePaidOff;

    setExpenseFields((previous) => {
      const exactRentIndex = previous.findIndex((item) => (item.label || '').trim().toLowerCase() === 'rent');

      if (isRenting) {
        if (exactRentIndex >= 0) {
          const next = [...previous];
          next[exactRentIndex] = {
            ...next[exactRentIndex],
            label: 'Rent',
            value: rentAmount,
            category: 'needs'
          };
          return next;
        }

        return [
          {
            ...createItem('Rent'),
            value: rentAmount,
            category: 'needs'
          },
          ...previous
        ];
      }

      return previous.filter((item) => (item.label || '').trim().toLowerCase() !== 'rent');
    });

    setDebtFields((previous) => {
      const exactMortgageIndex = previous.findIndex((item) => (item.label || '').trim().toLowerCase() === 'mortgage');

      if (isRenting || homePaidOff) {
        return previous.filter((item) => (item.label || '').trim().toLowerCase() !== 'mortgage');
      }

      const mortgageDebt = {
        ...(exactMortgageIndex >= 0 ? previous[exactMortgageIndex] : createItem('Mortgage')),
        label: 'Mortgage',
        balance: mortgageBalance,
        minimumPayment: monthlyMortgagePayment,
        interestRate: mortgageInterestRate,
        debtType: 'mortgage'
      };

      if (exactMortgageIndex >= 0) {
        const next = [...previous];
        next[exactMortgageIndex] = mortgageDebt;
        return next;
      }

      return [mortgageDebt, ...previous];
    });

    setAssetFields((previous) => {
      const exactHomeEquityIndex = previous.findIndex((item) => (item.label || '').trim().toLowerCase() === 'home equity');

      if (isRenting || homePaidOff || parseAmount(homeEquity) <= 0) {
        return previous.filter((item) => (item.label || '').trim().toLowerCase() !== 'home equity');
      }

      const homeEquityAsset = {
        ...(exactHomeEquityIndex >= 0 ? previous[exactHomeEquityIndex] : createItem('Home Equity', 'monthly', 'needs', 'other')),
        label: 'Home Equity',
        assetType: 'other',
        value: homeEquity
      };

      if (exactHomeEquityIndex >= 0) {
        const next = [...previous];
        next[exactHomeEquityIndex] = homeEquityAsset;
        return next;
      }

      return [homeEquityAsset, ...previous];
    });

    setActiveStep(0);
    setMaxUnlockedStep(0);
    setHasStarted(true);
    setShowHousingChooser(false);
    setShowHelpChooser(false);
  };

  return (
    <div className="finance-page relative overflow-hidden bg-gradient-to-br from-[#0f2f1a] via-[#2f6a2e] to-[#56a046] text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(220,255,220,0.2),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(134,239,172,0.28),transparent_35%),radial-gradient(circle_at_50%_85%,rgba(34,197,94,0.24),transparent_50%)]" />

      <OnboardingScreens
        hasStarted={hasStarted}
        setHasStarted={setHasStarted}
        showHelpChooser={showHelpChooser}
        showHousingChooser={showHousingChooser}
        setShowHelpChooser={setShowHelpChooser}
        setShowHousingChooser={setShowHousingChooser}
        selectedHelpOptions={selectedHelpOptions}
        helpOptions={helpOptions}
        allOptionLabel={allOptionLabel}
        handleHelpOptionToggle={handleHelpOptionToggle}
        handleHelpChooserContinue={handleHelpChooserContinue}
        housingInfo={housingInfo}
        updateHousingInfo={updateHousingInfo}
        handleHousingPaidOffToggle={handleHousingPaidOffToggle}
        canContinueHousing={canContinueHousing}
        handleHousingContinue={handleHousingContinue}
      />

      {hasStarted && !formCollapsed && (
        <>
          <nav className="stepper-breadcrumb stepper-line" aria-label="Input steps">
            <ol>
              {activeInputSteps.map((step, index) => {
                const isCurrent = index === activeStep;
                const isUnlocked = index <= maxUnlockedStep;
                return (
                  <li key={step.key} className="stepper-step">
                    <button
                      type="button"
                      className={`step-dot ${isCurrent ? 'current' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`}
                      onClick={() => handleStepDotClick(index)}
                      disabled={!isUnlocked}
                      aria-label={`Go to ${step.title}`}
                    >
                      <span>{index + 1}</span>
                    </button>
                    <div className="step-title-link-wrapper">
                      <button
                        type="button"
                        className={`step-title-link ${isCurrent ? 'current' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`}
                        onClick={() => handleStepDotClick(index)}
                        disabled={!isUnlocked}
                        aria-label={`Go to ${step.title}`}
                      >
                        {step.title}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="stepper-stage relative">
            <div key={currentStep ? currentStep.key : 'no-step'} className="step-stage-card">
              {currentStep && currentStep.key === 'about-me'
                ? (
                  <AboutMeColumn
                    aboutMe={aboutMe}
                    updateAboutMeField={updateAboutMeField}
                    activeAmountField={activeAmountField}
                    setActiveAmountField={setActiveAmountField}
                    formatCurrencyDisplay={formatCurrencyDisplay}
                    sanitizeDecimalInput={sanitizeDecimalInput}
                  />
                )
                : currentStep && currentStep.key === 'savings-goals'
                  ? (
                    <SavingsGoalsColumn
                      values={savingsGoalFields}
                      setter={setSavingsGoalFields}
                      inputPrefix={currentStep.prefix}
                      buttonText={currentStep.addText}
                      editingItemId={editingItemId}
                      draftLabel={draftLabel}
                      setDraftLabel={setDraftLabel}
                      saveEditingLabel={saveEditingLabel}
                      cancelEditingLabel={cancelEditingLabel}
                      startEditingLabel={startEditingLabel}
                      activeAmountField={activeAmountField}
                      setActiveAmountField={setActiveAmountField}
                      formatCurrencyDisplay={formatCurrencyDisplay}
                      updateFieldAmountByKey={updateFieldAmountByKey}
                      updateFieldCategory={updateFieldCategory}
                      removeField={removeField}
                      addField={(title, setter, values) => {
                        const nextLabel = `Goal ${values.length + 1}`;
                        setter([...values, createSavingsGoalItem(nextLabel, values.length + 1)]);
                      }}
                    />
                  )
                : (currentStep && (
                  <FinanceInputColumn
                    title={currentStep.title}
                    values={currentStep.values}
                    setter={currentStep.setter}
                    inputPrefix={currentStep.prefix}
                    buttonText={currentStep.addText}
                    editingItemId={editingItemId}
                    draftLabel={draftLabel}
                    setDraftLabel={setDraftLabel}
                    saveEditingLabel={saveEditingLabel}
                    cancelEditingLabel={cancelEditingLabel}
                    startEditingLabel={startEditingLabel}
                    activeAmountField={activeAmountField}
                    setActiveAmountField={setActiveAmountField}
                    activeRateField={activeRateField}
                    setActiveRateField={setActiveRateField}
                    formatCurrencyDisplay={formatCurrencyDisplay}
                    formatPercentDisplay={formatPercentDisplay}
                    updateFieldAmountByKey={updateFieldAmountByKey}
                    updateDebtField={updateDebtField}
                    updateAssetField={updateAssetField}
                    sanitizeDecimalInput={sanitizeDecimalInput}
                    updateFieldValue={updateFieldValue}
                    updateFieldFrequency={updateFieldFrequency}
                    updateFieldCategory={updateFieldCategory}
                    updateAssetType={updateAssetType}
                    updateFieldBooleanByKey={updateFieldBooleanByKey}
                    removeField={removeField}
                    addField={addField}
                  />
                ))}
            </div>
          </div>

          <div className={`stepper-actions relative ${activeStep === 0 ? 'single-action' : ''}`}>
            {activeStep > 0 && (
              <button
                type="button"
                className="add-field-btn"
                onClick={handlePreviousStep}
              >
                Previous
              </button>
            )}
            <button
              type="button"
              className="calculate-btn"
              onClick={handleNextStep}
            >
              {activeStep === activeInputSteps.length - 1 ? 'Calculate' : 'Next'}
            </button>
          </div>
        </>
      )}

      {hasStarted && formCollapsed && calculationResult && (
        <ResultsPanel
          calculationResult={calculationResult}
          showBudgetResults={showBudgetResults}
          showDebtResults={showDebtResults}
          showNetWorthResults={showNetWorthResults}
          showGuidelinesResults={showGuidelinesResults}
          showRetirementResults={showRetirementResults}
          dismissedWarnings={dismissedWarnings}
          dismissWarning={dismissWarning}
          formatCurrency={formatCurrency}
          selectedSegment={selectedSegment}
          setSelectedSegment={setSelectedSegment}
          payoffMethod={payoffMethod}
          setPayoffMethod={setPayoffMethod}
          totalDebtPayoffSummary={totalDebtPayoffSummary}
          maxAdditionalDebtPayment={maxAdditionalDebtPayment}
          additionalDebtPayment={additionalDebtPayment}
          setAdditionalDebtPayment={setAdditionalDebtPayment}
          parseAmount={parseAmount}
          rolloverPaidOffMinimums={rolloverPaidOffMinimums}
          setRolloverPaidOffMinimums={setRolloverPaidOffMinimums}
          payoffTimeline={payoffTimeline}
          payoffTimelineStartLabel={payoffTimelineStartLabel}
          payoffTimelineEndLabel={payoffTimelineEndLabel}
          payoffPhases={payoffPhases}
          selectedPayoffPhaseKey={selectedPayoffPhaseKey}
          setSelectedPayoffPhaseKey={setSelectedPayoffPhaseKey}
          netWorthData={netWorthData}
          selectedNetWorthSegment={selectedNetWorthSegment}
          setSelectedNetWorthSegment={setSelectedNetWorthSegment}
          segmentPalette={segmentPalette}
          guidelines={guidelines}
          retirementRateOfReturn={retirementRateOfReturn}
          setRetirementRateOfReturn={setRetirementRateOfReturn}
          onEditInputs={() => {
            setFormCollapsed(false);
            const maxStepIndex = Math.max(activeInputSteps.length - 1, 0);
            setActiveStep(maxStepIndex);
            setMaxUnlockedStep(maxStepIndex);
          }}
        />
      )}
    </div>
  );
}

export default Index;
