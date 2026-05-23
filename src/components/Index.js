import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
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
const STORAGE_KEY = 't-money-toolbox-calculator-data';

function Index() {
  const [incomeFields, setIncomeFields] = useState([createItem('Primary Paycheck', 'biweekly')]);
  const [assetFields, setAssetFields] = useState([createItem('Primary Account', 'monthly', 'needs', 'checking account')]);
  const [expenseFields, setExpenseFields] = useState([
    { ...createItem('Rent'), isRent: true },
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
  const [retirementAge, setRetirementAge] = useState(65);
  const [additionalSavings, setAdditionalSavings] = useState(null);
  const [activeAmountField, setActiveAmountField] = useState(null);
  const [activeRateField, setActiveRateField] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [showHousingChooser, setShowHousingChooser] = useState(false);
  const [showCarLoansChooser, setShowCarLoansChooser] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [initialResultStep, setInitialResultStep] = useState(0);
  const [currentInput, setCurrentInput] = useState(0);
  const [currentResult, setCurrentResult] = useState(0);
  const hasLoadedFromStorageRef = useRef(false);
  const [housingInfo, setHousingInfo] = useState({
    occupancy: 'rent',
    rentAmount: '',
    mortgageBalance: '',
    mortgageInterestRate: '',
    monthlyMortgagePayment: '',
    homeEquity: '',
    homePaidOff: false
  });
  const [carLoansInfo, setCarLoansInfo] = useState({
    hasCarLoans: 'yes',
    loans: [{
      id: `car-loan-${Date.now()}`,
      name: '',
      balance: '',
      interestRate: '',
      monthlyPayment: ''
    }]
  });
  const [aboutMe, setAboutMe] = useState({
    age: '',
    highestDeductible: '',
    hasHighDeductiblePlan: false,
    householdGrossAnnualIncome: ''
  });

  // Load saved data from localStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        
        // Restore all saved state
        if (parsed.incomeFields) setIncomeFields(parsed.incomeFields);
        if (parsed.assetFields) setAssetFields(parsed.assetFields);
        if (parsed.expenseFields) setExpenseFields(parsed.expenseFields);
        if (parsed.debtFields) setDebtFields(parsed.debtFields);
        if (parsed.contributionFields) setContributionFields(parsed.contributionFields);
        if (parsed.savingsGoalFields) setSavingsGoalFields(parsed.savingsGoalFields);
        if (parsed.housingInfo) setHousingInfo(parsed.housingInfo);
        if (parsed.carLoansInfo) setCarLoansInfo(parsed.carLoansInfo);
        if (parsed.aboutMe) setAboutMe(parsed.aboutMe);
        if (parsed.payoffMethod) setPayoffMethod(parsed.payoffMethod);
        if (parsed.additionalDebtPayment !== undefined) setAdditionalDebtPayment(parsed.additionalDebtPayment);
        if (parsed.rolloverPaidOffMinimums !== undefined) setRolloverPaidOffMinimums(parsed.rolloverPaidOffMinimums);
        if (parsed.retirementRateOfReturn !== undefined) setRetirementRateOfReturn(parsed.retirementRateOfReturn);
        if (parsed.retirementAge !== undefined) setRetirementAge(parsed.retirementAge);
        if (parsed.additionalSavings !== undefined) setAdditionalSavings(parsed.additionalSavings);
        if (parsed.currentInput !== undefined) setCurrentInput(parsed.currentInput);
        if (parsed.currentResult !== undefined) setCurrentResult(parsed.currentResult);
        
        // Mark that we've loaded from storage to prevent contributionFields from being overwritten
        hasLoadedFromStorageRef.current = true;
        
        // When loading saved data, show welcome back screen and prepare to show results
        setShowWelcomeBack(true);
        setMaxUnlockedStep(ALL_STEP_KEYS.length - 1);
        // Set initial result step to dashboard (last tab)
        setInitialResultStep(999); // Will be clamped to last step in ResultsPanel
      }
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
    }
  }, []); // Empty dependency array - run only on mount

  // Function to save current state to localStorage
  const saveToLocalStorage = useCallback(() => {
    try {
      const dataToSave = {
        incomeFields,
        assetFields,
        expenseFields,
        debtFields,
        contributionFields,
        savingsGoalFields,
        housingInfo,
        carLoansInfo,
        aboutMe,
        payoffMethod,
        additionalDebtPayment,
        rolloverPaidOffMinimums,
        retirementRateOfReturn,
        retirementAge,
        additionalSavings,
        hasStarted,
        showHousingChooser,
        currentInput,
        currentResult,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
    }
  }, [
    incomeFields,
    assetFields,
    expenseFields,
    debtFields,
    contributionFields,
    savingsGoalFields,
    housingInfo,
    carLoansInfo,
    aboutMe,
    payoffMethod,
    additionalDebtPayment,
    rolloverPaidOffMinimums,
    retirementRateOfReturn,
    retirementAge,
    additionalSavings,
    hasStarted,
    showHousingChooser,
    currentInput,
    currentResult
  ]);

  // Auto-save when user returns to results page after editing
  useEffect(() => {
    if (calculationResult && formCollapsed) {
      saveToLocalStorage();
      // Reset initial result step after first load so subsequent views start at budget
      if (initialResultStep > 0) {
        setInitialResultStep(0);
      }
    }
  }, [formCollapsed, calculationResult, initialResultStep, saveToLocalStorage]);

  useEffect(() => {
    // Don't auto-generate contributionFields if we just loaded from storage
    if (hasLoadedFromStorageRef.current) {
      hasLoadedFromStorageRef.current = false;
      return;
    }

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

  // Sync debt minimum payments and retirement contributions to expense fields
  useEffect(() => {
    setExpenseFields((previous) => {
      // Get all non-auto-generated expenses (exclude debt payments and retirement contributions)
      const userExpenses = previous.filter(
        (expense) => !expense.isDebtPayment && !expense.isRetirementContribution
      );
      
      // Create debt payment expenses from current debt fields
      const debtPaymentExpenses = debtFields
        .filter((debt) => parseAmount(debt.balance) > 0 && parseAmount(debt.minimumPayment) > 0)
        .map((debt, index) => {
          const existing = previous.find((expense) => expense.linkedDebtId === debt.id);
          
          if (existing) {
            return {
              ...existing,
              label: `${debt.label || `Debt ${index + 1}`} Payment`,
              value: String(parseAmount(debt.minimumPayment))
            };
          }
          
          return {
            ...createItem(`${debt.label || `Debt ${index + 1}`} Payment`, 'monthly', 'needs', 'checking account', true, debt.id),
            value: String(parseAmount(debt.minimumPayment))
          };
        });
      
      // Create contribution expenses from contribution fields (all types: savings, investment, retirement)
      const contributionExpenses = contributionFields
        .filter((contribution) => parseAmount(contribution.monthlyContribution) > 0)
        .map((contribution) => {
          const existing = previous.find((expense) => expense.linkedContributionId === contribution.id);
          const contributionAmount = parseAmount(contribution.monthlyContribution);
          const multiplier = getContributionMultiplier(contribution.frequency);
          const monthlyAmount = contributionAmount * multiplier;
          
          if (existing) {
            return {
              ...existing,
              label: `${contribution.label} Contribution`,
              value: String(monthlyAmount)
            };
          }
          
          return {
            ...createItem(`${contribution.label} Contribution`, 'monthly', 'save', contribution.assetType || 'savings account', false, null, true, contribution.id),
            value: String(monthlyAmount)
          };
        });
      
      return [...userExpenses, ...debtPaymentExpenses, ...contributionExpenses];
    });
  }, [debtFields, contributionFields]);

  // Sync car loans to debt fields
  useEffect(() => {
    setDebtFields((previous) => {
      // Get all non-car-loan debts (user-added debts and mortgage)
      const userDebts = previous.filter((debt) => !debt.isCarLoan);
      
      // Create car loan debts from current car loans info
      const carLoanDebts = carLoansInfo.hasCarLoans === 'yes' 
        ? carLoansInfo.loans
            .filter((loan) => parseAmount(loan.balance) > 0 && parseAmount(loan.monthlyPayment) > 0)
            .map((loan) => {
              const existing = previous.find((debt) => debt.linkedCarLoanId === loan.id);
              
              if (existing) {
                return {
                  ...existing,
                  label: loan.name || 'Car Loan',
                  balance: loan.balance,
                  minimumPayment: loan.monthlyPayment,
                  interestRate: loan.interestRate,
                  debtType: 'auto',
                  isCarLoan: true,
                  linkedCarLoanId: loan.id
                };
              }
              
              return {
                id: `debt-${loan.id}`,
                label: loan.name || 'Car Loan',
                value: '',
                frequency: 'monthly',
                category: 'needs',
                assetType: 'checking account',
                activelyContributing: false,
                balance: loan.balance,
                minimumPayment: loan.monthlyPayment,
                interestRate: loan.interestRate,
                debtType: 'auto',
                isCarLoan: true,
                linkedCarLoanId: loan.id,
                isDebtPayment: false,
                linkedDebtId: null,
                isRetirementContribution: false,
                linkedContributionId: null
              };
            })
        : [];
      
      return [...carLoanDebts, ...userDebts];
    });
  }, [carLoansInfo]);

  // Sync HSA to asset fields based on high deductible plan selection
  useEffect(() => {
    setAssetFields((previous) => {
      const hsaIndex = previous.findIndex((asset) => asset.isHSA);

      if (!aboutMe.hasHighDeductiblePlan) {
        // Remove HSA if high deductible plan is not selected
        return previous.filter((asset) => !asset.isHSA);
      }

      // Add or update HSA if high deductible plan is selected
      const hsaAsset = {
        ...(hsaIndex >= 0 ? previous[hsaIndex] : createItem('HSA', 'monthly', 'needs', 'retirement account')),
        label: 'HSA',
        assetType: 'retirement account',
        value: hsaIndex >= 0 ? previous[hsaIndex].value : '0',
        isHSA: true
      };

      if (hsaIndex >= 0) {
        const next = [...previous];
        next[hsaIndex] = hsaAsset;
        return next;
      }

      return [hsaAsset, ...previous];
    });
  }, [aboutMe.hasHighDeductiblePlan]);

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

    const totalMortgage = expenseFields
      .filter((expense) => (expense.label || '').toLowerCase().includes('mortgage'))
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

    const isOwner = housingInfo.occupancy === 'own';
    const rentLow = monthlyIncome * 0.25;
    const rentHigh = monthlyIncome * 0.33;
    const mortgageLimit = monthlyIncome * 0.25;
    const carLimit = monthlyIncome * 0.08;

    // Housing guideline - different for renters vs owners
    const housingGuideline = isOwner
      ? {
          id: 'mortgage-budget-cap',
          label: 'Mortgage Budget',
          detail: `Your mortgage should be 25% or less of your monthly income. Your mortgage: ${formatCurrency(totalMortgage)}. Recommended: ${formatCurrency(mortgageLimit)} or less.`,
          passed: totalMortgage <= mortgageLimit
        }
      : {
          id: 'rent-budget-band',
          label: 'Rent Budget',
          detail: `Your rent should be between 25% and 33% of your monthly income, or less. Your rent: ${formatCurrency(totalRent)}. Recommended: ${formatCurrency(rentLow)} - ${formatCurrency(rentHigh)} or less.`,
          passed: totalRent <= rentHigh
        };

    return [
      {
        id: 'checking-needs-band',
        label: 'Checking Account Balance',
        detail: `Your checking account should have between 1x and 2x your monthly needs. You have ${formatCurrency(totalCheckingAccounts)}. Recommended: ${formatCurrency(monthlyNeeds)} - ${formatCurrency(monthlyNeeds * 2)}.`,
        passed: totalCheckingAccounts >= monthlyNeeds && totalCheckingAccounts <= (monthlyNeeds * 2)
      },
      {
        id: 'savings-needs-6x',
        label: 'Savings Accounts Balance',
        detail: `Your savings account should have at least 6x your monthly needs. You have ${formatCurrency(totalSavingsAccounts)}. Required: ${formatCurrency(sixMonthNeeds)}.`,
        passed: totalSavingsAccounts >= sixMonthNeeds
      },
      housingGuideline,
      {
        id: 'car-budget-cap',
        label: 'Car Payment Budget',
        detail: `Your car payment should be 8% or less of your monthly income. Your payment: ${formatCurrency(carLimitCheckAmount)}. Recommended: ${formatCurrency(carLimit)} or less.`,
        passed: carLimitCheckAmount <= carLimit
      }
    ];
  }, [assetFields, expenseFields, debtFields, calculationResult, housingInfo]);

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
    setDraftLabel('');
  };

  const saveEditingLabel = (setter, values, index) => {
    const trimmedLabel = draftLabel.trim();
    const finalLabel = trimmedLabel || `Item ${index + 1}`;

    const nextValues = [...values];
    nextValues[index] = {
      ...nextValues[index],
      label: finalLabel
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
    setAboutMe((previous) => ({
      ...previous,
      [key]: value
    }));
  };

  const enabledInputStepKeys = useMemo(() => {
    return new Set(ALL_STEP_KEYS);
  }, []);

  const showBudgetResults = true;
  const showDebtResults = true;
  const showNetWorthResults = true;
  const showGuidelinesResults = true;
  const showRetirementResults = true;
  const showSavingsResults = true;
  const showFOOResults = true;

  const allInputSteps = [
    {
      key: 'about-me',
      title: 'About Me',
      values: [],
      setter: () => {},
      prefix: 'about-me',
      addText: ''
    },
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
      key: 'contributions',
      title: 'Contributions',
      values: contributionFields,
      setter: setContributionFields,
      prefix: 'contribution',
      addText: 'Add Contribution'
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
    setCurrentInput(nextStep);
    setMaxUnlockedStep((previous) => Math.max(previous, nextStep));
  };

  const handlePreviousStep = () => {
    if (activeStep === 0) {
      return;
    }

    const prevStep = activeStep - 1;
    setActiveStep(prevStep);
    setCurrentInput(prevStep);
  };

  const handleStepDotClick = (stepIndex) => {
    if (stepIndex > maxUnlockedStep) {
      return;
    }
    setCurrentInput(stepIndex);

    setActiveStep(stepIndex);
  };

  const handleCalculate = () => {
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

    // Note: Retirement contributions are now added as expense fields via useEffect
    // so we don't need to add them here anymore

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

      // For Save category, only show "Over Budget" if exceeding by more than 10%
      let status;
      if (category === 'save') {
        if (actual > budget * 1.10) {
          status = 'Over Budget';
        } else if (actual < budget) {
          status = 'Under Budget';
        } else {
          status = 'At Budget';
        }
      } else {
        status = getBudgetStatus(actual, budget);
      }

      return {
        category,
        label: categoryLabels[category],
        budget,
        actual,
        remainingBudget,
        difference,
        status,
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
    if (savingsSummary && savingsSummary.budget > 0 && savingsSummary.actual > savingsSummary.budget * 1.10) {
      const percentOver = ((savingsSummary.actual / savingsSummary.budget) - 1) * 100;
      warnings.push(`Savings is ${percentOver.toFixed(1)}% over budget.`);
    }

    const totalExpenses = categorySummaries.reduce((sum, item) => sum + item.actual, 0);
    const remainingAfterExpenses = monthlyIncome - totalExpenses;
    const addlDebtPaymentSum = expenseFields
      .filter((item) => item.category === 'save' && item.addlDebtPayment)
      .reduce((sum, item) => sum + parseAmount(item.value), 0);

    // Debt-to-income ratio calculation
    const totalMonthlyDebtPayments = debtFields
      .filter((debt) => parseAmount(debt.balance) > 0)
      .reduce((sum, debt) => sum + parseAmount(debt.minimumPayment), 0);
    const debtToIncomeRatio = monthlyIncome > 0 ? (totalMonthlyDebtPayments / monthlyIncome) * 100 : 0;

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
      const employerMatch = monthlyAmount * matchPercent / 100;
      return sum + monthlyAmount + employerMatch;
    }, 0);

    // Determine retirement target based on age with linear interpolation
    // Milestones: Age 30 = 1x, Age 40 = 3x, Age 50 = 6x, Age 60 = 9x, Age 67 = 10x
    let retirementTargetMultiplier = 0;
    let nextMilestoneAge = 30;
    let nextMilestoneMultiplier = 1;
    let currentMilestoneAge = 0;
    let currentMilestoneMultiplier = 0;
    
    if (userAge >= 67) {
      retirementTargetMultiplier = 10;
      nextMilestoneAge = 67;
      nextMilestoneMultiplier = 10;
      currentMilestoneAge = 67;
      currentMilestoneMultiplier = 10;
    } else if (userAge >= 60) {
      currentMilestoneAge = 60;
      currentMilestoneMultiplier = 9;
      nextMilestoneAge = 67;
      nextMilestoneMultiplier = 10;
      // Interpolate between 60 (9x) and 67 (10x)
      const progress = (userAge - 60) / (67 - 60);
      retirementTargetMultiplier = 9 + (10 - 9) * progress;
    } else if (userAge >= 50) {
      currentMilestoneAge = 50;
      currentMilestoneMultiplier = 6;
      nextMilestoneAge = 60;
      nextMilestoneMultiplier = 9;
      // Interpolate between 50 (6x) and 60 (9x)
      const progress = (userAge - 50) / (60 - 50);
      retirementTargetMultiplier = 6 + (9 - 6) * progress;
    } else if (userAge >= 40) {
      currentMilestoneAge = 40;
      currentMilestoneMultiplier = 3;
      nextMilestoneAge = 50;
      nextMilestoneMultiplier = 6;
      // Interpolate between 40 (3x) and 50 (6x)
      const progress = (userAge - 40) / (50 - 40);
      retirementTargetMultiplier = 3 + (6 - 3) * progress;
    } else if (userAge >= 30) {
      currentMilestoneAge = 30;
      currentMilestoneMultiplier = 1;
      nextMilestoneAge = 40;
      nextMilestoneMultiplier = 3;
      // Interpolate between 30 (1x) and 40 (3x)
      const progress = (userAge - 30) / (40 - 30);
      retirementTargetMultiplier = 1 + (3 - 1) * progress;
    } else if (userAge >= 21) {
      currentMilestoneAge = 21;
      currentMilestoneMultiplier = 0;
      nextMilestoneAge = 30;
      nextMilestoneMultiplier = 1;
      // Interpolate between 21 (0x) and 30 (1x)
      // Assumes retirement savings typically start around age 21
      const progress = (userAge - 21) / (30 - 21);
      retirementTargetMultiplier = 0 + (1 - 0) * progress;
    } else {
      // Under 21 - typically haven't started saving yet
      nextMilestoneAge = 30;
      nextMilestoneMultiplier = 1;
      retirementTargetMultiplier = 0;
    }

    const annualIncome = parseAmount(aboutMe.householdGrossAnnualIncome) || (monthlyIncome * 12);
    const retirementTarget = annualIncome * retirementTargetMultiplier;
    const nextMilestoneTarget = annualIncome * nextMilestoneMultiplier;
    const isOnTrack = totalRetirementBalance >= retirementTarget;
    const percentOfTarget = retirementTarget > 0 ? (totalRetirementBalance / retirementTarget) * 100 : 0;

    // Calculate future value projection at retirement age
    const yearsToRetirement = Math.max(0, retirementAge - userAge);
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

    // Savings Projections calculation
    const savingsAccounts = assetFields.filter((asset) => 
      (asset.assetType || '').toLowerCase().includes('savings')
    );

    const bestSavingsAccount = savingsAccounts.reduce((best, account) => {
      const rate = parseAmount(account.interestRate);
      const bestRate = best ? parseAmount(best.interestRate) : 0;
      return rate > bestRate ? account : best;
    }, null);

    const recommendedInterestRate = bestSavingsAccount ? parseAmount(bestSavingsAccount.interestRate) : 4.5;
    
    // Calculate total contribution expenses (already added to save expenses)
    const totalContributionExpenses = expenseFields
      .filter((item) => item.isRetirementContribution)
      .reduce((sum, item) => sum + parseAmount(item.value), 0);
    
    // Monthly savings available for goals = total save spending - debt payments - all contributions + additional savings
    const baseMonthlySavingsContribution = savingsSummary 
      ? savingsSummary.actual - addlDebtPaymentSum - totalContributionExpenses
      : 0;
    
    // additionalSavings slider represents total monthly savings for goals (can be adjusted above or below base)
    const monthlySavingsContribution = additionalSavings !== null ? additionalSavings : baseMonthlySavingsContribution;

    const preparedGoals = savingsGoalFields
      .map((goal, index) => ({
        id: goal.id,
        label: goal.label || `Goal ${index + 1}`,
        amountSaved: Math.max(parseAmount(goal.amountSaved), 0),
        amountNeeded: Math.max(parseAmount(goal.amountNeeded), 0),
        priority: goal.priority || index + 1
      }))
      .filter((goal) => goal.amountNeeded > 0)
      .sort((a, b) => a.priority - b.priority);

    const savingsTimeline = [];
    let cumulativeSavings = 0;
    let previousMonths = 0;

    preparedGoals.forEach((goal) => {
      const stillNeeded = Math.max(goal.amountNeeded - goal.amountSaved - cumulativeSavings, 0);
      
      if (stillNeeded <= 0) {
        savingsTimeline.push({
          ...goal,
          monthsToComplete: 0,
          totalMonths: previousMonths,
          completionAmount: goal.amountNeeded,
          alreadyFunded: true
        });
        cumulativeSavings += Math.max(goal.amountNeeded - goal.amountSaved, 0);
        return;
      }

      if (monthlySavingsContribution <= 0) {
        savingsTimeline.push({
          ...goal,
          monthsToComplete: Infinity,
          totalMonths: Infinity,
          completionAmount: goal.amountSaved,
          alreadyFunded: false
        });
        return;
      }

      const monthlyRate = recommendedInterestRate / 100 / 12;
      let balance = goal.amountSaved + cumulativeSavings;
      let months = 0;
      const maxMonths = 600;

      while (balance < goal.amountNeeded && months < maxMonths) {
        balance += balance * monthlyRate;
        balance += monthlySavingsContribution;
        months += 1;
      }

      savingsTimeline.push({
        ...goal,
        monthsToComplete: months,
        totalMonths: previousMonths + months,
        completionAmount: balance,
        alreadyFunded: false
      });

      cumulativeSavings += stillNeeded;
      previousMonths += months;
    });

    const savingsProjection = {
      timeline: savingsTimeline,
      bestSavingsAccount: bestSavingsAccount ? {
        label: bestSavingsAccount.label,
        interestRate: recommendedInterestRate
      } : null,
      hasSavingsAccount: savingsAccounts.length > 0,
      recommendedRate: recommendedInterestRate,
      monthlySavingsContribution,
      baseMonthlySavingsContribution,
      totalGoals: preparedGoals.length
    };

    const maxAdditionalSavings = Math.max(0, remainingAfterExpenses);

    // Financial Order of Operations calculation
    // userAge already declared above for retirement tracking
    const highestDeductible = parseAmount(aboutMe.highestDeductible);
    
    // Step 1: Deductibles covered
    // savingsAccounts already declared above for savings projections
    const totalSavingsBalance = savingsAccounts.reduce((sum, account) => 
      sum + parseAmount(account.value), 0
    );
    const step1Complete = totalSavingsBalance >= highestDeductible && highestDeductible > 0;

    // Step 2: Employer Match
    const retirementContributionsWithMatch = contributionFields.filter((contribution) => 
      (contribution.assetType || '').toLowerCase() === 'retirement account' &&
      parseAmount(contribution.monthlyContribution) > 0
    );
    const step2Complete = retirementContributionsWithMatch.length > 0 &&
      retirementContributionsWithMatch.every((contribution) => contribution.maxMatchAchieved);

    // Step 3: High interest debt
    const debtsWithDetails = debtFields.map((debt) => ({
      id: debt.id,
      label: debt.label,
      balance: parseAmount(debt.balance),
      interestRate: parseAmount(debt.interestRate),
      debtType: (debt.debtType || 'other').toLowerCase(),
      minimumPayment: parseAmount(debt.minimumPayment)
    })).filter((debt) => debt.balance > 0);

    const highInterestDebts = debtsWithDetails.filter((debt) => {
      // Regular debt over 7%
      if (debt.interestRate > 7) {
        return true;
      }

      // Age-based student loan criteria
      if (debt.debtType === 'student loan') {
        if (userAge >= 20 && userAge < 30 && debt.interestRate > 6) return true;
        if (userAge >= 30 && userAge < 40 && debt.interestRate > 5) return true;
        if (userAge >= 40 && userAge < 50 && debt.interestRate > 4) return true;
        if (userAge >= 50 && debt.interestRate > 0) return true;
      }

      return false;
    });

    const step3Complete = highInterestDebts.length === 0;

    // Step 4: Emergency Fund (6 months of needs expenses)
    const needsExpenses = categorySummaries.find(cat => cat.category === 'needs')?.actual || 0;
    const emergencyFundTarget = needsExpenses * 6;
    const step4Complete = totalSavingsBalance >= emergencyFundTarget && emergencyFundTarget > 0;

    // Step 5: ROTH and HSA contributions
    const rothContributions = contributionFields.filter((contribution) => {
      const label = (contribution.label || '').toLowerCase();
      return (label.includes('roth') || label.includes('hsa')) && parseAmount(contribution.monthlyContribution) > 0;
    });
    
    const hsaAsset = assetFields.find((asset) => asset.isHSA);
    const isContributingToHSA = hsaAsset && hsaAsset.activelyContributing;
    const hasRothContributions = rothContributions.length > 0;
    const hsaRequired = aboutMe.hasHighDeductiblePlan;
    
    const step5Complete = (() => {
      if (!hsaRequired) {
        return hasRothContributions;
      }
      
      return hasRothContributions && isContributingToHSA;
    })();

    // Step 6: Max out retirement (on track + 25% of gross income)
    const retirementContributionPercentage = monthlyIncome > 0 
      ? (monthlyRetirementContribution / monthlyIncome) * 100 
      : 0;
    const step6Complete = retirementTracking.isOnTrack && retirementContributionPercentage >= 25;

    // Step 7: Hyper Accumulation (savings budget met + active investment contribution)
    const saveBudgetSummary = categorySummaries.find(cat => cat.category === 'save');
    const saveBudgetMet = saveBudgetSummary && saveBudgetSummary.actual >= saveBudgetSummary.budget;
    const investmentContributions = contributionFields.filter((contribution) => {
      const assetType = (contribution.assetType || '').toLowerCase();
      return assetType === 'investment account' && parseAmount(contribution.monthlyContribution) > 0;
    });
    const step7Complete = saveBudgetMet && investmentContributions.length > 0;

    // Step 8: Prepaid Expenses (savings goal exists + active contribution)
    const activeSavingsGoals = savingsGoalFields.filter((goal) => 
      parseAmount(goal.monthlyContribution) > 0
    );
    const step8Complete = activeSavingsGoals.length > 0;

    // Step 9: Low interest debt (no debt remaining)
    const totalRemainingDebt = debtsWithDetails.reduce((sum, d) => sum + d.balance, 0);
    const step9Complete = totalRemainingDebt === 0;

    // Determine current step
    let currentStep = 1;
    if (step1Complete) currentStep = 2;
    if (step1Complete && step2Complete) currentStep = 3;
    if (step1Complete && step2Complete && step3Complete) currentStep = 4;
    if (step1Complete && step2Complete && step3Complete && step4Complete) currentStep = 5;
    if (step1Complete && step2Complete && step3Complete && step4Complete && step5Complete) currentStep = 6;
    if (step1Complete && step2Complete && step3Complete && step4Complete && step5Complete && step6Complete) currentStep = 7;
    if (step1Complete && step2Complete && step3Complete && step4Complete && step5Complete && step6Complete && step7Complete) currentStep = 8;
    if (step1Complete && step2Complete && step3Complete && step4Complete && step5Complete && step6Complete && step7Complete && step8Complete) currentStep = 9;
    if (step1Complete && step2Complete && step3Complete && step4Complete && step5Complete && step6Complete && step7Complete && step8Complete && step9Complete) currentStep = 10; // All done!

    const financialOrderOfOperations = {
      currentStep,
      steps: [
        {
          number: 1,
          title: 'Deductibles Covered',
          description: 'The "Oh Shit" fund. If you achieve this step, no matter what happens, crashed car, broken leg, etc. You will be able to cover the deductible. This will save you from making desperate decisions that could set you back quite far.',
          completed: step1Complete,
          details: {
            totalSavingsBalance,
            highestDeductible,
            remaining: Math.max(0, highestDeductible - totalSavingsBalance)
          }
        },
        {
          number: 2,
          title: 'Employer Match',
          description: 'This is a big deal, there is a reason it is number 2. If your employer offers a match on retirement contributions this is guaranteed growth which is the golden goose of all investors. You should do your absolute best to create enough margin in your budget that you can take advantage of this amazing opportunity.',
          completed: step2Complete,
          details: {
            totalRetirementContributions: retirementContributionsWithMatch.length,
            contributionsWithMaxMatch: retirementContributionsWithMatch.filter(c => c.maxMatchAchieved).length,
            contributionsNeedingMatch: retirementContributionsWithMatch.filter(c => !c.maxMatchAchieved)
          }
        },
        {
          number: 3,
          title: 'High-Interest Debt',
          description: 'High Interest debt eviscerates financial growth and needs to be dealt with quickly. It can very quickly spiral. This is any debt you have where the interest outpaces the expected return you could get from investing the money instead (7%), with the exception of student loans.',
          completed: step3Complete,
          details: {
            highInterestDebts,
            totalHighInterestDebt: highInterestDebts.reduce((sum, d) => sum + d.balance, 0)
          }
        },
        {
          number: 4,
          title: 'Emergency Fund',
          description: 'This is the safety net and honestly, until you have this in place, I would recommend putting every dollar you can into achieving this and the previous steps. Not having an emergency savings IS an emergency. This will make sure you are covered no matter what happens, without this, if something were to happen, you would need to put it on debt. This is an important step that should not be skipped as the peace of mind is priceless.',
          completed: step4Complete,
          details: {
            totalSavingsBalance,
            emergencyFundTarget,
            monthlyNeedsExpenses: needsExpenses,
            remaining: Math.max(0, emergencyFundTarget - totalSavingsBalance)
          }
        },
        {
          number: 5,
          title: 'ROTH IRA & HSA',
          description: 'These are the best retirement accounts you can contribute to after you max out your employer match. HSAs have a triple tax advantage and ROTH IRAs are a bit less restrictive than 401Ks.',
          completed: step5Complete,
          details: {
            rothContributions,
            totalRothContributions: rothContributions.length,
            monthlyRothAmount: rothContributions.reduce((sum, c) => 
              sum + parseAmount(c.monthlyContribution) * getContributionMultiplier(c.frequency), 0
            ),
            hsaRequired,
            isContributingToHSA,
            hasRothContributions,
            requirementMessage: hsaRequired 
              ? 'Requires Roth IRA and HSA contributions'
              : 'Requires Roth IRA or HSA contributions'
          }
        },
        {
          number: 6,
          title: 'Max Out Retirement',
          description: 'Once you are maxing out ROTH IRA and/or HSA contributions, if you still are not contributing at least 25% of your income (including employer matches) you should contribute more to your 401K until you hit that percentage.',
          completed: step6Complete,
          details: {
            isOnTrack: retirementTracking.isOnTrack,
            retirementContributionPercentage,
            monthlyRetirementContribution,
            monthlyIncome,
            targetContribution: monthlyIncome * 0.25
          }
        },
        {
          number: 7,
          title: 'Hyper Accumulation',
          description: 'At this point, you can start having some fun. You can open an individual brokerage account and start investing in stocks that you can access before you are old!',
          completed: step7Complete,
          details: {
            saveBudgetMet,
            saveActual: saveBudgetSummary?.actual || 0,
            saveAllocated: saveBudgetSummary?.budget || 0,
            investmentContributions,
            totalInvestmentContributions: investmentContributions.length,
            monthlyInvestmentAmount: investmentContributions.reduce((sum, c) => 
              sum + parseAmount(c.monthlyContribution) * getContributionMultiplier(c.frequency), 0
            )
          }
        },
        {
          number: 8,
          title: 'Prepaid Expenses',
          description: 'This step is where you can start saving for things like vacations, new car, home down payment, etc. All the things above are a more efficient use of your money, but personal finance is PERSONAL. If you need to save up for something before you complete a previous step, that is ok, just be smart!',
          completed: step8Complete,
          details: {
            activeSavingsGoals,
            totalSavingsGoals: activeSavingsGoals.length,
            monthlySavingsGoalAmount: activeSavingsGoals.reduce((sum, g) => 
              sum + parseAmount(g.monthlyContribution), 0
            )
          }
        },
        {
          number: 9,
          title: 'Low Interest Debt',
          description: 'The least efficient use of your money, but can provide a lot of piece of mind. Also, it cuts down on that needs budget. And just think about it "Debt-Free", what a thing to be!',
          completed: step9Complete,
          details: {
            totalRemainingDebt,
            totalDebts: debtsWithDetails.length
          }
        }
      ]
    };

    setCalculationResult({
      monthlyIncome,
      totalExpenses,
      categorySummaries,
      warnings,
      retirementTracking,
      debtToIncomeRatio,
      totalMonthlyDebtPayments,
      savingsProjection,
      financialOrderOfOperations,
      maxAdditionalSavings
    });
    setAdditionalDebtPayment(Math.max(100, addlDebtPaymentSum));
    setAdditionalSavings(baseMonthlySavingsContribution);
    setPayoffMethod('snowball');
    setRolloverPaidOffMinimums(true);
    setDismissedWarnings([]);
    setSelectedSegment(null);
    setSelectedPayoffPhaseKey(null);
    setSelectedNetWorthSegment(null);
    setMaxUnlockedStep(activeInputSteps.length - 1);
    setFormCollapsed(true);
    setInitialResultStep(currentResult);

    // Save all input data to localStorage
    saveToLocalStorage();
  };

  // Recalculate when retirement rate of return changes (if already viewing results)
  useEffect(() => {
    if (calculationResult) {
      // User is viewing results and changed the rate slider, so recalculate
      handleCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retirementRateOfReturn]);

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
            category: 'needs',
            isRent: true
          };
          return next;
        }

        return [
          {
            ...createItem('Rent'),
            value: rentAmount,
            category: 'needs',
            isRent: true
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

    setShowHousingChooser(false);
    setShowCarLoansChooser(true);
  };

  const updateCarLoansInfo = (hasLoans) => {
    if (hasLoans === 'no') {
      setCarLoansInfo({
        hasCarLoans: 'no',
        loans: []
      });
    } else {
      setCarLoansInfo((previous) => ({
        ...previous,
        hasCarLoans: 'yes',
        loans: previous.loans.length > 0 ? previous.loans : [{
          id: `car-loan-${Date.now()}`,
          name: '',
          balance: '',
          interestRate: '',
          monthlyPayment: ''
        }]
      }));
    }
  };

  const updateCarLoan = (loanId, field, value) => {
    setCarLoansInfo((previous) => ({
      ...previous,
      loans: previous.loans.map((loan) =>
        loan.id === loanId ? { ...loan, [field]: sanitizeDecimalInput(value) } : loan
      )
    }));
  };

  const addCarLoan = () => {
    setCarLoansInfo((previous) => ({
      ...previous,
      loans: [
        ...previous.loans,
        {
          id: `car-loan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: '',
          balance: '',
          interestRate: '',
          monthlyPayment: ''
        }
      ]
    }));
  };

  const removeCarLoan = (loanId) => {
    setCarLoansInfo((previous) => ({
      ...previous,
      loans: previous.loans.filter((loan) => loan.id !== loanId)
    }));
  };

  const canContinueCarLoans = useMemo(() => {
    if (carLoansInfo.hasCarLoans === 'no') {
      return true;
    }

    return carLoansInfo.loans.every((loan) => {
      return loan.balance && loan.interestRate && loan.monthlyPayment;
    });
  }, [carLoansInfo]);

  const handleCarLoansContinue = () => {
    if (!canContinueCarLoans) {
      return;
    }

    setActiveStep(0);
    setMaxUnlockedStep(0);
    setHasStarted(true);
    setShowCarLoansChooser(false);
  };

  return (
    <div className="finance-page relative overflow-hidden bg-gradient-to-br from-[#0f2f1a] via-[#2f6a2e] to-[#56a046] text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(220,255,220,0.2),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(134,239,172,0.28),transparent_35%),radial-gradient(circle_at_50%_85%,rgba(34,197,94,0.24),transparent_50%)]" />

      <OnboardingScreens
        hasStarted={hasStarted}
        setHasStarted={setHasStarted}
        showHousingChooser={showHousingChooser}
        setShowHousingChooser={setShowHousingChooser}
        showCarLoansChooser={showCarLoansChooser}
        setShowCarLoansChooser={setShowCarLoansChooser}
        showWelcomeBack={showWelcomeBack}
        setShowWelcomeBack={setShowWelcomeBack}
        handleCalculate={handleCalculate}
        housingInfo={housingInfo}
        updateHousingInfo={updateHousingInfo}
        handleHousingPaidOffToggle={handleHousingPaidOffToggle}
        canContinueHousing={canContinueHousing}
        handleHousingContinue={handleHousingContinue}
        carLoansInfo={carLoansInfo}
        updateCarLoansInfo={updateCarLoansInfo}
        updateCarLoan={updateCarLoan}
        addCarLoan={addCarLoan}
        removeCarLoan={removeCarLoan}
        canContinueCarLoans={canContinueCarLoans}
        handleCarLoansContinue={handleCarLoansContinue}
        calculationResult={calculationResult}
      />

      {hasStarted && !formCollapsed && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              type="button"
              className="add-field-btn"
              onClick={() => {
                setShowHousingChooser(true);
                setShowWelcomeBack(false);
                setHasStarted(false);
              }}
              style={{ fontSize: '0.875rem' }}
            >
              ← Change Housing & Car Loans
            </button>
          </div>
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
            {calculationResult && currentStep?.key !== 'savings-goals' && (
              <button
                type="button"
                className="add-field-btn"
                onClick={handleCalculate}
                style={{ marginLeft: activeStep === 0 ? '0' : 'auto', marginRight: '0.5rem' }}
              >
                Recalculate
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
          showSavingsResults={showSavingsResults}
          showFOOResults={showFOOResults}
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
          retirementAge={retirementAge}
          setRetirementAge={setRetirementAge}
          maxAdditionalSavings={calculationResult.maxAdditionalSavings}
          additionalSavings={additionalSavings}
          setAdditionalSavings={setAdditionalSavings}
          initialActiveStep={initialResultStep}
          onEditInputs={() => {
            setFormCollapsed(false);
            const targetStep = Math.min(currentInput, Math.max(activeInputSteps.length - 1, 0));
            setActiveStep(targetStep);
            setMaxUnlockedStep(Math.max(targetStep, maxUnlockedStep));
          }}
          onResultStepChange={setCurrentResult}
        />
      )}
    </div>
  );
}

export default Index;
