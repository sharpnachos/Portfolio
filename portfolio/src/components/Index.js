import React, { useState } from 'react';
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

  const createItem = (label, frequency = 'monthly', category = 'needs') => ({
    id: `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    value: '',
    frequency,
    category,
    balance: '',
    minimumPayment: '',
    interestRate: ''
  });

  const [incomeFields, setIncomeFields] = useState([createItem('Primary Paycheck')]);
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

  const getBudgetStatus = (actual, budget) => {
    const difference = actual - budget;

    if (Math.abs(difference) < 0.01) {
      return 'At Budget';
    }

    return difference > 0 ? 'Over Budget' : 'Under Budget';
  };

  const updateFieldValue = (setter, values, index, newValue) => {
    const nextValues = [...values];
    nextValues[index] = {
      ...nextValues[index],
      value: newValue
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

    setCalculationResult({
      monthlyIncome,
      totalExpenses,
      categorySummaries,
      warnings
    });
    setDismissedWarnings([]);
    setSelectedSegment(null);
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
                      value={item.balance || ''}
                      placeholder="Balance"
                      onChange={(event) => updateDebtField(setter, values, index, 'balance', event.target.value)}
                    />
                    <input
                      id={`${fieldId}-minimum`}
                      type="text"
                      value={item.minimumPayment || ''}
                      placeholder="Min monthly payment"
                      onChange={(event) => updateDebtField(setter, values, index, 'minimumPayment', event.target.value)}
                    />
                    <input
                      id={`${fieldId}-interest`}
                      type="text"
                      value={item.interestRate || ''}
                      placeholder="Interest rate %"
                      onChange={(event) => updateDebtField(setter, values, index, 'interestRate', event.target.value)}
                    />
                  </div>
                ) : (
                  <input
                    id={fieldId}
                    type="text"
                    value={item.value}
                    placeholder={`Enter ${item.label.toLowerCase()} amount`}
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
          <div className="columns-grid">
            {renderColumn('Income', incomeFields, setIncomeFields, 'income', 'Add Income')}
            {renderColumn('Expenses', expenseFields, setExpenseFields, 'expense', 'Add Expense')}
            {renderColumn('Debt', debtFields, setDebtFields, 'debt', 'Add Debt')}
          </div>

          <div className="calculate-row">
            <button
              type="button"
              className="calculate-btn"
              onClick={handleCalculate}
            >
              Calculate
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
              onClick={() => setFormCollapsed(false)}
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
                    <span className={`budget-status ${item.status === 'Over Budget' ? 'status-over' : item.status === 'Under Budget' ? 'status-under' : 'status-at'}`}>
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
        </section>
      )}
    </div>
  );
}

export default Index;