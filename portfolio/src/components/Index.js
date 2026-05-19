import React, { useMemo, useState } from 'react';
import '../styles/Index.css';

function Index() {
  const categoryOrder = ['needs', 'wants', 'save'];
  const categoryLabels = {
    needs: 'Needs',
    wants: 'Wants',
    save: 'Save'
  };
  const segmentPalette = {
    needs: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd'],
    wants: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
    save: ['#22c55e', '#4ade80', '#86efac', '#bbf7d0']
  };

  const createItem = (label, frequency = 'monthly', category = 'needs', assetType = 'checking account') => ({
    id: `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    value: '',
    frequency,
    category,
    assetType,
    balance: '',
    minimumPayment: '',
    interestRate: ''
  });

  const [incomeFields, setIncomeFields] = useState([createItem('Primary Paycheck')]);
  const [assetFields, setAssetFields] = useState([createItem('Primary Account', 'monthly', 'needs', 'checking account')]);
  const [expenseFields, setExpenseFields] = useState([
    createItem('Rent'),
    createItem('Groceries'),
    createItem('Transportation'),
    createItem('Utilities'),
    createItem('Insurance')
  ]);
  const [debtFields, setDebtFields] = useState([createItem('Debt 1')]);
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
  const [activeAmountField, setActiveAmountField] = useState(null);
  const [activeRateField, setActiveRateField] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(0);

  const sanitizeDecimalInput = (rawValue, maxDecimals = 2) => {
    const value = String(rawValue ?? '').replace(/[^0-9.]/g, '');
    const parts = value.split('.');

    if (parts.length === 1) {
      return parts[0];
    }

    const whole = parts[0];
    const decimal = parts.slice(1).join('').slice(0, maxDecimals);
    return `${whole}.${decimal}`;
  };

  const parseAmount = (rawValue) => {
    if (!rawValue) {
      return 0;
    }

    const normalized = String(rawValue).replace(/[^0-9.-]/g, '');
    const parsed = Number.parseFloat(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getIncomeMultiplier = (frequency) => {
    if (frequency === 'weekly') {
      return 52 / 12;
    }

    if (frequency === 'biweekly') {
      return 26 / 12;
    }

    return 1;
  };

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

  const getBudgetStatus = (actual, budget) => {
    const difference = actual - budget;

    if (Math.abs(difference) < 0.01) {
      return 'At Budget';
    }

    return difference > 0 ? 'Over Budget' : 'Under Budget';
  };

  const formatPayoffTime = (months) => {
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

  const getPayoffMonthYear = (months) => {
    const now = new Date();
    const payoffDate = new Date(now.getFullYear(), now.getMonth() + months, 1);

    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    }).format(payoffDate);
  };

  const getMonthYearFromOffset = (monthsOffset) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthsOffset, 1);

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric'
    }).format(targetDate);
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
      widthPercent: maxMagnitude > 0 ? (asset.amount / maxMagnitude) * 100 : 0
    }));

    const debtsWithWidth = debts.map((debt) => ({
      ...debt,
      widthPercent: maxMagnitude > 0 ? (debt.amount / maxMagnitude) * 100 : 0
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
        label: 'Checking accounts should be between 1x and 2x monthly needs.',
        detail: `${formatCurrency(totalCheckingAccounts)} vs range ${formatCurrency(monthlyNeeds)} - ${formatCurrency(monthlyNeeds * 2)}`,
        passed: totalCheckingAccounts >= monthlyNeeds && totalCheckingAccounts <= (monthlyNeeds * 2)
      },
      {
        id: 'rent-budget-band',
        label: 'Rent budget should be between 25% and 33% of monthly income.',
        detail: `${formatCurrency(totalRent)} vs range ${formatCurrency(rentLow)} - ${formatCurrency(rentHigh)}`,
        passed: totalRent >= rentLow && totalRent <= rentHigh
      },
      {
        id: 'car-budget-cap',
        label: 'Car payment budget should be 8% or less of monthly income.',
        detail: `${formatCurrency(totalCarPayment)} vs max ${formatCurrency(carLimit)}`,
        passed: totalCarPayment <= carLimit
      }
    ];
  }, [assetFields, expenseFields, calculationResult]);

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

  const updateAssetType = (setter, values, index, newAssetType) => {
    const nextValues = [...values];
    nextValues[index] = {
      ...nextValues[index],
      assetType: newAssetType
    };
    setter(nextValues);
  };

  const addField = (title, setter, values) => {
    const nextLabel = `${title} ${values.length + 1}`;
    setter([...values, createItem(nextLabel)]);
  };

  const removeField = (setter, values, index) => {
    if (values.length === 1) {
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

  const inputSteps = [
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
      key: 'expenses',
      title: 'Expenses',
      values: expenseFields,
      setter: setExpenseFields,
      prefix: 'expense',
      addText: 'Add Expense'
    },
    {
      key: 'debt',
      title: 'Debt',
      values: debtFields,
      setter: setDebtFields,
      prefix: 'debt',
      addText: 'Add Debt'
    }
  ];

  const handleNextStep = () => {
    if (activeStep >= inputSteps.length - 1) {
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
    const monthlyIncome = incomeFields.reduce((sum, item) => {
      const amount = parseAmount(item.value);
      return sum + (amount * getIncomeMultiplier(item.frequency));
    }, 0);

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

    if (totalMinimumDebtPayments > 0) {
      expenseItemsByCategory.needs = [
        ...expenseItemsByCategory.needs,
        {
          id: 'auto-debt-payments',
          label: 'Debt Payments',
          amount: totalMinimumDebtPayments
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

      const itemSegments = expenseItemsByCategory[category].map((entry, index) => {
        const percentOfBudget = budget > 0 ? (entry.amount / budget) * 100 : 0;
        const widthPercent = actual > 0 ? (entry.amount / actual) * fillPercent : 0;

        return {
          ...entry,
          percentOfBudget,
          widthPercent,
          color: segmentPalette[category][index % segmentPalette[category].length],
          hoverText: `${entry.label}: ${formatCurrency(entry.amount)} (${budget > 0 ? percentOfBudget.toFixed(1) : '0.0'}% of ${categoryLabels[category]} budget)`
        };
      });

      return {
        category,
        label: categoryLabels[category],
        budget,
        actual,
        difference,
        status: getBudgetStatus(actual, budget),
        itemSegments
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
    const defaultAdditionalPayment = remainingAfterExpenses >= 100
      ? 100
      : Math.max(0, Math.floor(remainingAfterExpenses));

    setCalculationResult({
      monthlyIncome,
      totalExpenses,
      categorySummaries,
      warnings
    });
    setAdditionalDebtPayment(defaultAdditionalPayment);
    setPayoffMethod('snowball');
    setRolloverPaidOffMinimums(true);
    setDismissedWarnings([]);
    setSelectedSegment(null);
    setSelectedPayoffPhaseKey(null);
    setSelectedNetWorthSegment(null);
    setMaxUnlockedStep(inputSteps.length - 1);
    setFormCollapsed(true);
  };

  const renderColumn = (title, values, setter, inputPrefix, buttonText) => (
    <section className="finance-column" aria-label={`${title} column`}>
      <h2>{title}</h2>
      <div className="field-list">
        {values.map((item, index) => {
          const fieldId = `${inputPrefix}-${item.id}`;

          return (
            <div className="field-row" key={fieldId}>
              {editingItemId === item.id ? (
                <input
                  type="text"
                  className="title-edit-input"
                  value={draftLabel}
                  onChange={(event) => setDraftLabel(event.target.value)}
                  onBlur={() => saveEditingLabel(setter, values, index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      saveEditingLabel(setter, values, index);
                    }

                    if (event.key === 'Escape') {
                      cancelEditingLabel();
                    }
                  }}
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className="item-title-btn"
                  onClick={() => startEditingLabel(item)}
                  aria-label={`Edit ${item.label} title`}
                >
                  {item.label}
                </button>
              )}
              <div className="field-controls">
                {title === 'Debt' ? (
                  <div className="debt-controls" aria-label={`${item.label} details`}>
                    <input
                      id={`${fieldId}-balance`}
                      type="text"
                      inputMode="decimal"
                      value={activeAmountField === `${fieldId}-balance` ? (item.balance || '') : formatCurrencyDisplay(item.balance)}
                      placeholder="Balance"
                      onFocus={() => setActiveAmountField(`${fieldId}-balance`)}
                      onBlur={() => setActiveAmountField(null)}
                      onChange={(event) => updateFieldAmountByKey(setter, values, index, 'balance', event.target.value)}
                    />
                    <input
                      id={`${fieldId}-minimum`}
                      type="text"
                      inputMode="decimal"
                      value={activeAmountField === `${fieldId}-minimum` ? (item.minimumPayment || '') : formatCurrencyDisplay(item.minimumPayment)}
                      placeholder="Min monthly payment"
                      onFocus={() => setActiveAmountField(`${fieldId}-minimum`)}
                      onBlur={() => setActiveAmountField(null)}
                      onChange={(event) => updateFieldAmountByKey(setter, values, index, 'minimumPayment', event.target.value)}
                    />
                    <input
                      id={`${fieldId}-interest`}
                      type="text"
                      inputMode="decimal"
                      value={activeRateField === `${fieldId}-interest` ? (item.interestRate || '') : formatPercentDisplay(item.interestRate)}
                      placeholder="Interest rate %"
                      onFocus={() => setActiveRateField(`${fieldId}-interest`)}
                      onBlur={() => setActiveRateField(null)}
                      onChange={(event) => updateDebtField(setter, values, index, 'interestRate', sanitizeDecimalInput(event.target.value))}
                    />
                  </div>
                ) : (
                  <input
                    id={fieldId}
                    type="text"
                    inputMode="decimal"
                    value={activeAmountField === fieldId ? item.value : formatCurrencyDisplay(item.value)}
                    placeholder={`Enter ${item.label.toLowerCase()} amount`}
                    onFocus={() => setActiveAmountField(fieldId)}
                    onBlur={() => setActiveAmountField(null)}
                    onChange={(event) => updateFieldValue(setter, values, index, event.target.value)}
                  />
                )}
                {title === 'Income' && (
                  <select
                    className="frequency-select"
                    value={item.frequency || 'monthly'}
                    onChange={(event) => updateFieldFrequency(setter, values, index, event.target.value)}
                    aria-label={`${item.label} frequency`}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                )}
                {title === 'Expenses' && (
                  <select
                    className="frequency-select"
                    value={item.category || 'needs'}
                    onChange={(event) => updateFieldCategory(setter, values, index, event.target.value)}
                    aria-label={`${item.label} category`}
                  >
                    <option value="needs">Needs</option>
                    <option value="wants">Wants</option>
                    <option value="save">Save</option>
                  </select>
                )}
                {title === 'Assets' && (
                  <select
                    className="frequency-select"
                    value={item.assetType || 'checking account'}
                    onChange={(event) => updateAssetType(setter, values, index, event.target.value)}
                    aria-label={`${item.label} asset type`}
                  >
                    <option value="checking account">Checking account</option>
                    <option value="savings account">Savings account</option>
                    <option value="retirement account">Retirement account</option>
                    <option value="investment account">Investment account</option>
                    <option value="other">Other</option>
                  </select>
                )}
                <button
                  type="button"
                  className="remove-field-btn"
                  onClick={() => removeField(setter, values, index)}
                  disabled={values.length === 1}
                  aria-label={`Remove ${item.label}`}
                  title={`Remove ${item.label}`}
                >
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="add-field-btn"
        onClick={() => addField(title, setter, values)}
      >
        {buttonText}
      </button>
    </section>
  );

  return (
    <div className="finance-page">
      <h1 className="page-title">Monthly Money Tracker</h1>
      <p className="page-subtitle">Add your information below and hit calculate when you are ready.</p>

      {!formCollapsed && (
        <>
          <div className="stepper-breadcrumb" aria-label="Input steps">
            {inputSteps.map((step, index) => {
              const isCurrent = index === activeStep;
              const isUnlocked = index <= maxUnlockedStep;

              return (
                <button
                  key={step.key}
                  type="button"
                  className={`step-dot ${isCurrent ? 'current' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`}
                  onClick={() => handleStepDotClick(index)}
                  disabled={!isUnlocked}
                  aria-label={`Go to ${step.title}`}
                >
                  <span>{index + 1}</span>
                  <small>{step.title}</small>
                </button>
              );
            })}
          </div>

          <div className="stepper-stage">
            {renderColumn(
              inputSteps[activeStep].title,
              inputSteps[activeStep].values,
              inputSteps[activeStep].setter,
              inputSteps[activeStep].prefix,
              inputSteps[activeStep].addText
            )}
          </div>

          <div className={`stepper-actions ${activeStep === 0 ? 'single-action' : ''}`}>
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
              {activeStep === inputSteps.length - 1 ? 'Calculate' : 'Next'}
            </button>
          </div>
        </>
      )}

      {formCollapsed && calculationResult && (
        <section className="results-panel" aria-label="Budget results">
          <div className="results-header">
            <h2>Budget Breakdown</h2>
            <button
              type="button"
              className="add-field-btn"
              onClick={() => {
                setFormCollapsed(false);
                setActiveStep(inputSteps.length - 1);
                setMaxUnlockedStep(inputSteps.length - 1);
              }}
            >
              Edit Inputs
            </button>
          </div>

          {calculationResult.warnings && calculationResult.warnings.length > 0 && (
            <div className="warning-banner-stack" role="alert" aria-live="polite">
              {calculationResult.warnings
                .map((warning, index) => ({ warning, warningKey: `${index}-${warning}` }))
                .filter((item) => !dismissedWarnings.includes(item.warningKey))
                .map((item) => (
                  <div key={item.warningKey} className="warning-banner">
                    <span>{item.warning}</span>
                    <button
                      type="button"
                      className="warning-close-btn"
                      onClick={() => dismissWarning(item.warningKey)}
                      aria-label="Dismiss warning"
                    >
                      x
                    </button>
                  </div>
                ))}
            </div>
          )}

          <div className="summary-metrics">
            <div className="metric-card">
              <p>Monthly Income</p>
              <strong>{formatCurrency(calculationResult.monthlyIncome)}</strong>
            </div>
            <div className="metric-card">
              <p>Total Expenses</p>
              <strong>{formatCurrency(calculationResult.totalExpenses)}</strong>
            </div>
          </div>

          <div className="budget-grid">
            {calculationResult.categorySummaries.map((item) => (
              <article className="budget-card" key={item.category}>
                <h3>{item.label}</h3>
                <p>Budget: {formatCurrency(item.budget)}</p>
                <p>Spent: {formatCurrency(item.actual)}</p>
                <p className={`budget-status ${item.status === 'Over Budget' ? 'status-over' : item.status === 'Under Budget' ? 'status-under' : 'status-at'}`}>
                  {item.status}
                </p>
              </article>
            ))}
          </div>

          <div className="chart-wrap" aria-label="Expense category budget bars">
            <h3>Category Budget Bars (Click segments for item details)</h3>
            <div className="category-bars">
              {calculationResult.categorySummaries.map((item) => (
                <div className="category-bar-card" key={item.category}>
                  <div className="category-bar-header">
                    <strong>{item.label}</strong>
                    <span>{formatCurrency(item.actual)} / {formatCurrency(item.budget)}</span>
                  </div>
                  <div className="category-budget-bar" title={`${item.label} budget cap: ${formatCurrency(item.budget)}`}>
                    {item.itemSegments.map((segment) => (
                      <div
                        key={`${item.category}-${segment.id}`}
                        className="expense-segment"
                        style={{
                          width: `${segment.widthPercent}%`,
                          backgroundColor: segment.color
                        }}
                        onClick={() => setSelectedSegment((current) => {
                          if (current && current.category === item.category && current.segmentId === segment.id) {
                            return null;
                          }

                          return {
                            category: item.category,
                            segmentId: segment.id,
                            label: segment.label,
                            amount: segment.amount
                          };
                        })}
                        title={segment.hoverText}
                        aria-label={segment.hoverText}
                      />
                    ))}
                  </div>
                  <div className="category-bar-meta">
                    <span className={`budget-status ${
                      item.category === 'save'
                        ? (item.status === 'Under Budget' ? 'status-over' : item.status === 'Over Budget' ? 'status-under' : 'status-at')
                        : (item.status === 'Over Budget' ? 'status-over' : item.status === 'Under Budget' ? 'status-under' : 'status-at')
                    }`}>
                      {item.status}
                    </span>
                    {item.difference > 0 && (
                      <span className="overflow-note">Over by {formatCurrency(item.difference)}</span>
                    )}
                    {item.itemSegments.length === 0 && (
                      <span className="overflow-note">No expenses entered</span>
                    )}
                    {selectedSegment && selectedSegment.category === item.category && (
                      <div className="segment-click-popover" role="status" aria-live="polite">
                        <strong>{selectedSegment.label}</strong>
                        <span>{formatCurrency(selectedSegment.amount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <section className="debt-timeline" aria-label="Debt payoff timeline">
            <div className="debt-timeline-header">
              <h3>Debt Payoff Timeline</h3>
              <div className="payoff-method-toggle" role="group" aria-label="Payoff method">
                <button
                  type="button"
                  className={`method-btn ${payoffMethod === 'snowball' ? 'active' : ''}`}
                  onClick={() => setPayoffMethod('snowball')}
                >
                  Snowball
                </button>
                <button
                  type="button"
                  className={`method-btn ${payoffMethod === 'avalanche' ? 'active' : ''}`}
                  onClick={() => setPayoffMethod('avalanche')}
                >
                  Avalanche
                </button>
              </div>
            </div>

            {totalDebtPayoffSummary && (
              <div className="debt-timeline-summary">
                <div className="timeline-summary-card">
                  <p>Total debt payoff time</p>
                  <strong>{totalDebtPayoffSummary.totalTime}</strong>
                </div>
                <div className="timeline-summary-card">
                  <p>Estimated debt-free month</p>
                  <strong>{totalDebtPayoffSummary.paidOffBy}</strong>
                </div>
              </div>
            )}

            <div className="extra-payment-controls">
              <label htmlFor="extra-debt-payment">Additional monthly debt payment</label>
              <div className="extra-payment-inputs">
                <input
                  id="extra-debt-payment"
                  type="range"
                  min="0"
                  max={maxAdditionalDebtPayment}
                  step="10"
                  value={Math.min(additionalDebtPayment, maxAdditionalDebtPayment)}
                  onChange={(event) => setAdditionalDebtPayment(parseAmount(event.target.value))}
                  disabled={maxAdditionalDebtPayment === 0}
                />
                <input
                  type="number"
                  min="0"
                  max={maxAdditionalDebtPayment}
                  step="10"
                  value={Math.min(additionalDebtPayment, maxAdditionalDebtPayment)}
                  onChange={(event) => {
                    const nextValue = parseAmount(event.target.value);
                    setAdditionalDebtPayment(Math.min(nextValue, maxAdditionalDebtPayment));
                  }}
                />
              </div>
              <label className="rollover-toggle">
                <input
                  type="checkbox"
                  checked={rolloverPaidOffMinimums}
                  onChange={(event) => setRolloverPaidOffMinimums(event.target.checked)}
                />
                Add paid-off debt minimum payments to extra payment
              </label>
            </div>

            <div className="debt-timeline-list">
              {payoffTimeline.length === 0 && (
                <p className="empty-debt-state">Add debt balances to see estimated payoff timelines.</p>
              )}
              {payoffTimeline.map((debt) => (
                <article key={debt.id} className="debt-timeline-item">
                  <div>
                    <strong>{debt.label}</strong>
                    <p>
                      Balance {formatCurrency(debt.balance)} | Min {formatCurrency(debt.minimumPayment)} | APR {debt.annualRate.toFixed(2)}%
                    </p>
                  </div>
                  <span className="payoff-time-badge">{debt.payoffText}</span>
                </article>
              ))}
            </div>

            <div className="payoff-phase-wrap">
              <h4>Payoff Timeline</h4>
              <div className="payoff-phase-labels">
                <span>{payoffTimelineStartLabel}</span>
                <span>{payoffTimelineEndLabel}</span>
              </div>
              <div className="payoff-phase-bar" aria-label="Debt payoff phase timeline">
                {payoffPhases.map((phase) => (
                  <button
                    key={phase.key}
                    type="button"
                    className={`payoff-phase-segment ${selectedPayoffPhaseKey === phase.key ? 'selected' : ''}`}
                    style={{ width: `${phase.widthPercent}%` }}
                    onClick={() => setSelectedPayoffPhaseKey(phase.key)}
                    title={`${phase.targetDebtLabel} from month ${phase.startMonth} to ${phase.endMonth}`}
                  />
                ))}
              </div>
              {payoffPhases.length === 0 && (
                <p className="empty-debt-state">No payoff phases to display yet.</p>
              )}
              {(() => {
                const activePhase = payoffPhases.find((phase) => phase.key === selectedPayoffPhaseKey) || payoffPhases[0];

                if (!activePhase) {
                  return null;
                }

                return (
                  <div className="payoff-phase-detail" role="status" aria-live="polite">
                    <strong>{activePhase.targetDebtLabel}</strong>
                    <span>Months {activePhase.startMonth} - {activePhase.endMonth}</span>
                    <span>Payment: {formatCurrency(activePhase.minimumPayment)} + {formatCurrency(activePhase.averageExtraPayment)}</span>
                    <span>Interest rate: {activePhase.annualRate.toFixed(2)}%</span>
                  </div>
                );
              })()}
            </div>
          </section>

          <section className="net-worth" aria-label="Net worth summary">
            <div className="net-worth-header">
              <h3>Net Worth</h3>
              <strong>{formatCurrency(netWorthData.netWorth)}</strong>
            </div>
            <div className="net-worth-bars">
              <div className="net-worth-row">
                <div className="net-worth-row-header">
                  <span>Assets</span>
                  <span>{formatCurrency(netWorthData.totalAssets)}</span>
                </div>
                <div className="net-worth-bar assets-bar">
                  <div className="net-worth-bar-fill" style={{ width: `${netWorthData.scalePercentAssets}%` }}>
                    {netWorthData.assets.map((asset, index) => (
                      <button
                        key={asset.id}
                        type="button"
                        className={`net-worth-segment ${selectedNetWorthSegment && selectedNetWorthSegment.type === 'asset' && selectedNetWorthSegment.id === asset.id ? 'selected' : ''}`}
                        style={{
                          width: `${asset.widthPercent}%`,
                          backgroundColor: segmentPalette.needs[index % segmentPalette.needs.length]
                        }}
                        onClick={() => setSelectedNetWorthSegment({ type: 'asset', id: asset.id })}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="net-worth-row">
                <div className="net-worth-row-header">
                  <span>Debts</span>
                  <span>{formatCurrency(netWorthData.totalDebts)}</span>
                </div>
                <div className="net-worth-bar debts-bar">
                  <div className="net-worth-bar-fill" style={{ width: `${netWorthData.scalePercentDebts}%` }}>
                    {netWorthData.debts.map((debt, index) => (
                      <button
                        key={debt.id}
                        type="button"
                        className={`net-worth-segment ${selectedNetWorthSegment && selectedNetWorthSegment.type === 'debt' && selectedNetWorthSegment.id === debt.id ? 'selected' : ''}`}
                        style={{
                          width: `${debt.widthPercent}%`,
                          backgroundColor: segmentPalette.wants[index % segmentPalette.wants.length]
                        }}
                        onClick={() => setSelectedNetWorthSegment({ type: 'debt', id: debt.id })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {(() => {
              if (!selectedNetWorthSegment) {
                return null;
              }

              if (selectedNetWorthSegment.type === 'asset') {
                const asset = netWorthData.assets.find((entry) => entry.id === selectedNetWorthSegment.id);
                if (!asset) {
                  return null;
                }

                return (
                  <div className="net-worth-detail" role="status" aria-live="polite">
                    <strong>{asset.label}</strong>
                    <span>Type: {asset.type}</span>
                    <span>Amount: {formatCurrency(asset.amount)}</span>
                  </div>
                );
              }

              const debt = netWorthData.debts.find((entry) => entry.id === selectedNetWorthSegment.id);
              if (!debt) {
                return null;
              }

              return (
                <div className="net-worth-detail" role="status" aria-live="polite">
                  <strong>{debt.label}</strong>
                  <span>Balance: {formatCurrency(debt.amount)}</span>
                  <span>Min payment: {formatCurrency(debt.minimumPayment)}</span>
                  <span>Interest rate: {debt.annualRate.toFixed(2)}%</span>
                </div>
              );
            })()}
          </section>

          <section className="guidelines" aria-label="Guidelines and limits">
            <h3>Guidelines and Limits</h3>
            <div className="guideline-list">
              {guidelines.map((rule) => (
                <article key={rule.id} className={`guideline-item ${rule.passed ? 'pass' : 'fail'}`}>
                  <strong>{rule.label}</strong>
                  <span>{rule.detail}</span>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}
    </div>
  );
}

export default Index;