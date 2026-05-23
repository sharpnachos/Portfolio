import React, { useState, useEffect, useRef } from 'react';

function ResultsPanel({
  calculationResult,
  showBudgetResults,
  showDebtResults,
  showNetWorthResults,
  showGuidelinesResults,
  showRetirementResults,
  showSavingsResults,
  showFOOResults,
  dismissedWarnings,
  dismissWarning,
  formatCurrency,
  selectedSegment,
  setSelectedSegment,
  payoffMethod,
  setPayoffMethod,
  totalDebtPayoffSummary,
  maxAdditionalDebtPayment,
  additionalDebtPayment,
  setAdditionalDebtPayment,
  parseAmount,
  rolloverPaidOffMinimums,
  setRolloverPaidOffMinimums,
  payoffTimeline,
  payoffTimelineStartLabel,
  payoffTimelineEndLabel,
  payoffPhases,
  selectedPayoffPhaseKey,
  setSelectedPayoffPhaseKey,
  netWorthData,
  selectedNetWorthSegment,
  setSelectedNetWorthSegment,
  segmentPalette,
  guidelines,
  retirementRateOfReturn,
  setRetirementRateOfReturn,
  retirementAge,
  setRetirementAge,
  maxAdditionalSavings,
  additionalSavings,
  setAdditionalSavings,
  initialActiveStep = 0,
  onEditInputs,
  onResultStepChange
}) {
  // Multi-step navigation state
  const [activeResultStep, setActiveResultStep] = useState(0);
  const [showPayoffMethodInfo, setShowPayoffMethodInfo] = useState(false);
  const [activeDebtPaymentField, setActiveDebtPaymentField] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const payoffMethodInfoRef = useRef(null);

  // Handle click outside to close payoff method info popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPayoffMethodInfo && payoffMethodInfoRef.current && !payoffMethodInfoRef.current.contains(event.target)) {
        setShowPayoffMethodInfo(false);
      }
    };

    if (showPayoffMethodInfo) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPayoffMethodInfo]);

  // Update activeResultStep when initialActiveStep changes (e.g., welcome back screen)
  useEffect(() => {
    if (initialActiveStep > 0) {
      setActiveResultStep(initialActiveStep);
    }
  }, [initialActiveStep]);

  // Notify parent component when activeResultStep changes
  useEffect(() => {
    if (onResultStepChange) {
      onResultStepChange(activeResultStep);
    }
  }, [activeResultStep, onResultStepChange]);

  // Calculate projected retirement value based on current slider values
  const calculateProjectedRetirementValue = () => {
    if (!calculationResult?.retirementTracking) {
      return 0;
    }

    const {
      currentAge,
      totalRetirementBalance,
      monthlyRetirementContribution
    } = calculationResult.retirementTracking;

    const yearsToRetirement = Math.max(0, retirementAge - currentAge);
    const monthsToRetirement = yearsToRetirement * 12;
    const monthlyRate = retirementRateOfReturn / 100 / 12;
    
    let projectedValue = totalRetirementBalance;
    
    if (monthsToRetirement > 0 && monthlyRetirementContribution > 0) {
      // Future value of current balance
      const futureValueOfBalance = totalRetirementBalance * Math.pow(1 + monthlyRate, monthsToRetirement);
      
      // Future value of monthly contributions (annuity)
      const futureValueOfContributions = monthlyRate > 0
        ? monthlyRetirementContribution * ((Math.pow(1 + monthlyRate, monthsToRetirement) - 1) / monthlyRate)
        : monthlyRetirementContribution * monthsToRetirement;
      
      projectedValue = futureValueOfBalance + futureValueOfContributions;
    } else if (monthsToRetirement > 0) {
      projectedValue = totalRetirementBalance * Math.pow(1 + monthlyRate, monthsToRetirement);
    }
    
    return projectedValue;
  };

  const projectedRetirementValue = calculateProjectedRetirementValue();
  const yearsToRetirement = calculationResult?.retirementTracking 
    ? Math.max(0, retirementAge - calculationResult.retirementTracking.currentAge)
    : 0;

  // Calculate savings timeline based on current slider values
  const calculateSavingsTimeline = () => {
    if (!calculationResult?.savingsProjection) {
      return [];
    }

    const {
      baseMonthlySavingsContribution,
      recommendedRate,
      timeline: originalTimeline
    } = calculationResult.savingsProjection;

    // additionalSavings slider represents total monthly savings (not an addition)
    const adjustedMonthlySavings = additionalSavings !== null ? additionalSavings : baseMonthlySavingsContribution;
    
    // Recalculate timeline with adjusted savings
    const savingsTimeline = [];
    let cumulativeSavings = 0;
    let previousMonths = 0;

    originalTimeline.forEach((goal) => {
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

      if (adjustedMonthlySavings <= 0) {
        savingsTimeline.push({
          ...goal,
          monthsToComplete: Infinity,
          totalMonths: Infinity,
          completionAmount: goal.amountSaved,
          alreadyFunded: false
        });
        return;
      }

      const monthlyRate = recommendedRate / 100 / 12;
      let balance = goal.amountSaved + cumulativeSavings;
      let months = 0;
      const maxMonths = 600;

      while (balance < goal.amountNeeded && months < maxMonths) {
        balance += balance * monthlyRate;
        balance += adjustedMonthlySavings;
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

    return savingsTimeline;
  };

  const savingsTimeline = calculateSavingsTimeline();
  const baseMonthlySavingsContribution = calculationResult?.savingsProjection?.baseMonthlySavingsContribution || 0;
  const projectedMonthlySavings = additionalSavings !== null 
    ? additionalSavings 
    : baseMonthlySavingsContribution;

  // Define steps based on what should be shown
  const steps = [];
  if (showBudgetResults) steps.push({ key: 'budget', label: 'Budget' });
  if (showDebtResults) steps.push({ key: 'debt', label: 'Debt Payoff' });
  if (showSavingsResults) steps.push({ key: 'savings', label: 'Savings Projections' });
  if (showNetWorthResults) steps.push({ key: 'networth', label: 'Net Worth' });
  if (showRetirementResults) steps.push({ key: 'retirement', label: 'Retirement' });
  if (showFOOResults) steps.push({ key: 'foo', label: 'Order of Operations' });
  if (showGuidelinesResults) steps.push({ key: 'guidelines', label: 'Guidelines' });
  steps.push({ key: 'dashboard', label: 'Dashboard' });

  // Clamp activeResultStep to valid range
  const clampedActiveStep = Math.min(activeResultStep, steps.length - 1);
  const currentStep = steps[clampedActiveStep];
  const isFirstStep = clampedActiveStep === 0;
  const isLastStep = clampedActiveStep === steps.length - 1;

  const handleNext = () => {
    if (!isLastStep) {
      setActiveResultStep(clampedActiveStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setActiveResultStep(clampedActiveStep - 1);
    }
  };

  const handleJumpToStep = (index) => {
    setActiveResultStep(index);
  };

  // Check if all FOO steps are completed
  const allFOOStepsCompleted = calculationResult?.financialOrderOfOperations?.currentStep === 10;

  // Auto-show celebration when all FOO steps are completed
  useEffect(() => {
    if (allFOOStepsCompleted && currentStep?.key === 'foo' && !showCelebration) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setShowCelebration(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [allFOOStepsCompleted, currentStep, showCelebration]);

  return (
    <section className="results-panel relative rounded-2xl border border-emerald-100/80 bg-white/92 shadow-glow backdrop-blur-sm" aria-label="Results">
      {/* Fireworks Celebration Modal */}
      {showCelebration && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '5rem',
            overflowY: 'auto',
            animation: 'fadeIn 0.3s ease-in'
          }}
          onClick={() => setShowCelebration(false)}
        >
          {/* Congratulations Message */}
          <div
            style={{
              position: 'relative',
              background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%)',
              borderRadius: '1rem',
              padding: '3rem 2rem',
              maxWidth: '600px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 0 60px rgba(255, 215, 0, 0.8), 0 0 100px rgba(255, 215, 0, 0.6), 0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              animation: 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), glow 2s ease-in-out infinite',
              border: '3px solid #ffed4e'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '2.5rem', color: '#854d0e', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              Congratulations!
            </h2>
            <p style={{ margin: '0 0 2rem 0', fontSize: '1.25rem', color: '#713f12', lineHeight: '1.6', fontWeight: '500' }}>
              You've completed all 9 steps of the Financial Order of Operations!
              <br />
              <span style={{ fontSize: '1rem', color: '#92400e' }}>You are killing it dude! LETS GOOOOOOOOO!!!!!</span>
            </p>
            <button
              type="button"
              onClick={() => setShowCelebration(false)}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: '#92400e',
                color: '#fef3c7',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#78350f';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#92400e';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Thanks, I know! 😎
            </button>
          </div>

          {/* Inline Keyframe Styles */}
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from {
                opacity: 0;
                transform: scale(0.8);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
            @keyframes glow {
              0%, 100% {
                box-shadow: 0 0 60px rgba(255, 215, 0, 0.8), 0 0 100px rgba(255, 215, 0, 0.6), 0 25px 50px -12px rgba(0, 0, 0, 0.5);
              }
              50% {
                box-shadow: 0 0 80px rgba(255, 215, 0, 1), 0 0 120px rgba(255, 215, 0, 0.8), 0 25px 50px -12px rgba(0, 0, 0, 0.5);
              }
            }
          `}</style>
        </div>
      )}

      <div className="results-header">
        <h2>{currentStep?.label || 'Results'}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.6, fontStyle: 'italic' }}>
            This is not financial advice
          </span>
          <button
            type="button"
            className="add-field-btn"
            onClick={onEditInputs}
          >
            Edit Inputs
          </button>
        </div>
      </div>

      {/* Step indicator */}
      <div className="results-stepper" role="navigation" aria-label="Results sections">
        {steps.map((step, index) => (
          <button
            key={step.key}
            type="button"
            className={`results-step-btn ${index === clampedActiveStep ? 'active' : ''} ${index < clampedActiveStep ? 'completed' : ''}`}
            onClick={() => handleJumpToStep(index)}
          >
            {step.label}
          </button>
        ))}
      </div>

      {/* Budget Results Step */}
      {currentStep?.key === 'budget' && (
        <>
          {calculationResult.warnings && calculationResult.warnings.length > 0 && (
            <div className="warning-banner-stack" role="alert" aria-live="polite">
              {calculationResult.warnings
                .map((warning, index) => ({ warning, warningKey: `${index}-${warning}` }))
                .filter((item) => !dismissedWarnings.includes(item.warningKey))
                .map((item) => (
                  <div key={item.warningKey} className="warning-banner">
                    <svg className="warning-banner-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="warning-banner-content">{item.warning}</span>
                    <button
                      type="button"
                      className="warning-close-btn"
                      onClick={() => dismissWarning(item.warningKey)}
                      aria-label="Dismiss warning"
                    >
                      ×
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
                <p className={`budget-status ${
                  item.category === 'save'
                    ? (item.status === 'Under Budget' ? 'status-over' : item.status === 'Over Budget' ? 'status-under' : 'status-at')
                    : (item.status === 'Over Budget' ? 'status-over' : item.status === 'Under Budget' ? 'status-under' : 'status-at')
                }`}>
                  {item.status}
                </p>
              </article>
            ))}
          </div>

          <div className="chart-wrap" aria-label="Expense category budget bars">
            <h3>Budget Category Breakdown (Click a segment for details)</h3>
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
                            amount: segment.amount,
                            percentOfBudget: segment.percentOfBudget,
                            percentOfIncome: segment.percentOfIncome,
                            isRemainingBudget: false
                          };
                        })}
                        title={segment.hoverText}
                        aria-label={segment.hoverText}
                      />
                    ))}
                    {item.remainingSegment && (
                      <button
                        type="button"
                        className="expense-segment remaining-segment"
                        style={{
                          width: `${item.remainingSegment.widthPercent}%`
                        }}
                        onClick={() => setSelectedSegment((current) => {
                          if (current && current.category === item.category && current.segmentId === item.remainingSegment.id) {
                            return null;
                          }

                          return {
                            category: item.category,
                            segmentId: item.remainingSegment.id,
                            label: item.remainingSegment.label,
                            amount: item.remainingSegment.amount,
                            percentOfBudget: item.remainingSegment.percentOfBudget,
                            percentOfIncome: item.remainingSegment.percentOfIncome,
                            isRemainingBudget: true
                          };
                        })}
                        title={item.remainingSegment.hoverText}
                        aria-label={item.remainingSegment.hoverText}
                      />
                    )}
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
                        <span>
                          {selectedSegment.isRemainingBudget ? 'Remaining' : 'Uses'} {selectedSegment.percentOfIncome.toFixed(1)}% of total income
                        </span>
                        <span>
                          {selectedSegment.percentOfBudget.toFixed(1)}% of {selectedSegment.isRemainingBudget ? 'this budget remains' : 'this budget'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Debt Results Step */}
      {currentStep?.key === 'debt' && (
        <section aria-label="Debt payoff timeline">
          <div className="debt-timeline-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3>Debt Payoff Timeline</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
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
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPayoffMethodInfo(!showPayoffMethodInfo);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#10b981',
                  fontSize: '1rem',
                  opacity: 0.7,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                aria-label="More information about payoff methods"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </button>
              {showPayoffMethodInfo && (
                <div
                  ref={payoffMethodInfoRef}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    marginTop: '0.5rem',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    zIndex: 1000,
                    minWidth: '350px',
                    maxWidth: '450px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: '0', fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>Debt Payoff Methods</h4>
                    <button
                      type="button"
                      onClick={() => setShowPayoffMethodInfo(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0',
                        color: '#6b7280',
                        fontSize: '1.25rem',
                        lineHeight: '1',
                        fontWeight: 'bold'
                      }}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: '600', color: '#1f2937' }}>Snowball Method</p>
                    <p style={{ margin: '0', fontSize: '0.8rem', color: '#4b5563', lineHeight: '1.5' }}>
                      You take the smallest debt, pay that off, then move to the next smallest, and keep going like that until all the debt has been eliminated. This method is a bit less effiecient as it does not take interest rates into account, but it has been known to be the most psychologically rewarding. this means people tend to stick to it longer.
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: '600', color: '#1f2937' }}>Avalanche Method</p>
                    <p style={{ margin: '0', fontSize: '0.8rem', color: '#4b5563', lineHeight: '1.5' }}>
                      This method has you pay off the debt with the highest interest first, then the second highest, and so on until all the debt is gone. This method is more efficient in terms of interest accrual. But it can be harder to stick with.
                    </p>
                  </div>
                </div>
              )}
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
            <label className="inline-checkbox rollover-toggle">
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
                    Balance {formatCurrency(debt.balance)} | Minimum monthly payment {formatCurrency(debt.minimumPayment)} | APR {debt.annualRate.toFixed(2)}%
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

          <br></br>

            {calculationResult.totalMonthlyDebtPayments > 0 && (
            <div className="debt-ratio-section">
              <h4>Debt-to-Income Ratio</h4>
              <div className="debt-ratio-content">
                <div className="debt-ratio-metric">
                  <p>Monthly Debt Payments</p>
                  <strong>{formatCurrency(calculationResult.totalMonthlyDebtPayments)}</strong>
                </div>
                <div className="debt-ratio-metric">
                  <p>DTI Ratio</p>
                  <strong className={
                    calculationResult.debtToIncomeRatio > 43 ? 'status-over' :
                    calculationResult.debtToIncomeRatio > 36 ? 'status-warning' :
                    'status-under'
                  }>
                    {calculationResult.debtToIncomeRatio.toFixed(1)}%
                  </strong>
                </div>
              </div>
              <p className="debt-ratio-guide">
                {calculationResult.debtToIncomeRatio <= 36 && "Ayyyy! Good work!"}
                {calculationResult.debtToIncomeRatio > 36 && calculationResult.debtToIncomeRatio <= 43 && "Hmm, it's alright but you may wanna try getting this a bit lower."}
                {calculationResult.debtToIncomeRatio > 43 && "Bro, you are cooked. You gotta fix this shit ASAP."}
              </p>
            </div>
          )}

        </section>
      )}

      {/* Savings Projections Step */}
      {currentStep?.key === 'savings' && calculationResult.savingsProjection && (
        <section aria-label="Savings projections timeline">
          <div className="savings-header">
            <h3>Savings Projections</h3>
            {!calculationResult.savingsProjection.hasSavingsAccount && (
              <div className="savings-recommendation">
                <svg className="info-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Consider opening a high-yield savings account at {calculationResult.savingsProjection.recommendedRate.toFixed(2)}% APY</p>
              </div>
            )}
            {calculationResult.savingsProjection.hasSavingsAccount && calculationResult.savingsProjection.bestSavingsAccount && (
              <div className="savings-recommendation success">
                <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>All savings should be stored in the "{calculationResult.savingsProjection.bestSavingsAccount.label}", this account has the highest interest rate of your accounts at: {calculationResult.savingsProjection.bestSavingsAccount.interestRate.toFixed(2)}% APY</p>
              </div>
            )}
          </div>

          <div className="savings-summary">
            <div className="timeline-summary-card">
              <p>Monthly contribution to "{calculationResult.savingsProjection.bestSavingsAccount.label}"</p>
              <strong>{formatCurrency(baseMonthlySavingsContribution)}</strong>
            </div>
            <div className="timeline-summary-card">
              <p>Total savings goals</p>
              <strong>{calculationResult.savingsProjection.totalGoals}</strong>
            </div>
          </div>

          <div className="extra-payment-controls">
            <label htmlFor="extra-savings-amount">Monthly savings contribution</label>
            <div className="extra-payment-inputs">
              <input
                id="extra-savings-amount"
                type="range"
                min="0"
                max={maxAdditionalSavings}
                step="10"
                value={Math.min(additionalSavings || 0, maxAdditionalSavings)}
                onChange={(event) => setAdditionalSavings(parseAmount(event.target.value))}
                disabled={maxAdditionalSavings === 0}
              />
              <input
                type="number"
                min="0"
                max={maxAdditionalSavings}
                step="10"
                value={Math.min(additionalSavings || 0, maxAdditionalSavings)}
                onChange={(event) => {
                  const nextValue = parseAmount(event.target.value);
                  setAdditionalSavings(Math.min(nextValue, maxAdditionalSavings));
                }}
              />
            </div>
          </div>

          {baseMonthlySavingsContribution <= 0 && (
            <div className="savings-warning">
              <p>You aren't saving anything lmao, go back to expenses and add a savings expense that isn't an additional debt payment. Otherwise you are never gonna hit this goal!</p>
            </div>
          )}

          {savingsTimeline.length > 0 && (
            <div className="savings-timeline">
              <h4>Goal Timeline (by priority)</h4>
              <div className="savings-timeline-list">
                {savingsTimeline.map((goal, index) => {
                  const monthsToComplete = goal.monthsToComplete;
                  const isInfinite = monthsToComplete === Infinity;
                  const years = Math.floor(monthsToComplete / 12);
                  const months = monthsToComplete % 12;
                  const timeLabel = goal.alreadyFunded 
                    ? 'Fully funded' 
                    : isInfinite
                      ? '∞'
                      : years > 0 
                        ? `${years}y ${months}m` 
                        : `${months}m`;

                  const completionDate = new Date();
                  completionDate.setMonth(completionDate.getMonth() + goal.totalMonths);
                  const completionLabel = goal.alreadyFunded 
                    ? 'Already achieved' 
                    : isInfinite
                      ? 'Never'
                      : completionDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

                  return (
                    <div key={goal.id} className="savings-timeline-item">
                      <div className="savings-goal-header">
                        <div className="savings-goal-info">
                          <span className="goal-priority">#{goal.priority}</span>
                          <strong>{goal.label}</strong>
                        </div>
                        <span className="goal-amount">{formatCurrency(goal.amountNeeded)}</span>
                      </div>
                      <div className="savings-goal-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{
                              width: `${Math.min((goal.amountSaved / goal.amountNeeded) * 100, 100)}%`
                            }}
                          />
                        </div>
                        <span className="progress-text">
                          {formatCurrency(goal.amountSaved)} saved
                        </span>
                      </div>
                      <div className="savings-goal-timeline">
                        <div className="timeline-metric">
                          <p>Time to complete</p>
                          <strong className={goal.alreadyFunded ? 'status-under' : ''}>{timeLabel}</strong>
                        </div>
                        <div className="timeline-metric">
                          <p>Completion date</p>
                          <strong>{completionLabel}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {savingsTimeline.length === 0 && (
            <div className="savings-empty">
              <p>No savings goals defined. Add goals in the Savings Goals section to see projections.</p>
            </div>
          )}
        </section>
      )}

      {/* Net Worth Results Step */}
      {currentStep?.key === 'networth' && (
        <section aria-label="Net worth summary">
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
                        width: `${asset.segmentPercent}%`,
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
                        width: `${debt.segmentPercent}%`,
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
      )}

      {/* Retirement Tracking Results Step */}
      {currentStep?.key === 'retirement' && calculationResult.retirementTracking && (
        <section aria-label="Retirement tracking">
          <h3>Retirement Tracking</h3>
          
          {calculationResult.retirementTracking.currentAge > 0 ? (
            <>
              <div className="retirement-status-card">
                <div className="retirement-status-header">
                  <h4>Current Status (Age {calculationResult.retirementTracking.currentAge})</h4>
                  <span className={`retirement-status-badge ${calculationResult.retirementTracking.isOnTrack ? 'on-track' : 'behind'}`}>
                    {calculationResult.retirementTracking.isOnTrack ? '✓ On Track' : '⚠ Behind'}
                  </span>
                </div>
                
                <div className="retirement-metrics">
                  <div className="retirement-metric-card">
                    <p>Total Retirement Savings</p>
                    <strong>{formatCurrency(calculationResult.retirementTracking.totalRetirementBalance)}</strong>
                  </div>
                  <div className="retirement-metric-card">
                    <p>Target for Your Age</p>
                    <strong>{formatCurrency(calculationResult.retirementTracking.retirementTarget)}</strong>
                    <span className="metric-subtext">
                      {calculationResult.retirementTracking.retirementTargetMultiplier.toFixed(1)}x annual household income
                    </span>
                  </div>
                  <div className="retirement-metric-card">
                    <p>Percentage of Target</p>
                    <strong>{calculationResult.retirementTracking.percentOfTarget.toFixed(1)}%</strong>
                  </div>
                  <div className="retirement-metric-card">
                    <p>Monthly Retirement Savings</p>
                    <strong>
                      {((calculationResult.retirementTracking.monthlyRetirementContribution / calculationResult.monthlyIncome) * 100).toFixed(1)}%
                    </strong>
                    <span className="metric-subtext">
                      of monthly income (including employer match)
                    </span>
                  </div>
                </div>

                <div className="retirement-progress-bar-wrap">
                  <div className="retirement-progress-bar">
                    <div 
                      className={`retirement-progress-fill ${calculationResult.retirementTracking.isOnTrack ? 'on-track' : 'behind'}`}
                      style={{ width: `${Math.min(calculationResult.retirementTracking.percentOfTarget, 100)}%` }}
                    />
                  </div>
                  <div className="retirement-progress-labels">
                    <span>Current: {formatCurrency(calculationResult.retirementTracking.totalRetirementBalance)}</span>
                    <span>Target: {formatCurrency(calculationResult.retirementTracking.retirementTarget)}</span>
                  </div>
                </div>
              </div>

              <div className="retirement-projection">
                <h4>Retirement Projection</h4>
                <p className="projection-subtext">
                  Based on your current savings and monthly contributions
                </p>

                  <div className="projection-controls">
                    <label htmlFor="retirement-age-slider">
                      Retirement Age: {retirementAge}
                    </label>
                    <div className="rate-slider-wrap">
                      <input
                        id="retirement-age-slider"
                        type="range"
                        min={calculationResult.retirementTracking.currentAge || 18}
                        max="100"
                        step="1"
                        value={retirementAge}
                        onChange={(event) => setRetirementAge(Number.parseInt(event.target.value, 10))}
                      />
                      <div className="rate-slider-labels">
                        <span>{calculationResult.retirementTracking.currentAge || 18}</span>
                        <span>65 (Standard)</span>
                        <span>100</span>
                      </div>
                    </div>

                    <label htmlFor="retirement-rate-slider">
                      Rate of Return: {retirementRateOfReturn}%
                    </label>
                    <div className="rate-slider-wrap">
                      <input
                        id="retirement-rate-slider"
                        type="range"
                        min="1"
                        max="20"
                        step="0.5"
                        value={retirementRateOfReturn}
                        onChange={(event) => setRetirementRateOfReturn(Number.parseFloat(event.target.value))}
                      />
                      <div className="rate-slider-labels">
                        <span>1%</span>
                        <span>Conservative (4-6%)</span>
                        <span>Moderate (7-10%)</span>
                        <span>Aggressive (11%+)</span>
                        <span>20%</span>
                      </div>
                    </div>
                  </div>

                  <div className="projection-summary">
                    <div className="projection-metric-card">
                      <p>Years to Retirement</p>
                      <strong>{yearsToRetirement} years</strong>
                      <span className="metric-subtext">Until age {retirementAge}</span>
                    </div>
                    <div className="projection-metric-card">
                      <p>Monthly Contribution</p>
                      <strong>{formatCurrency(calculationResult.retirementTracking.monthlyRetirementContribution)}</strong>
                      <span className="metric-subtext">Includes employer match</span>
                    </div>
                    <div className="projection-metric-card highlight">
                      <p>Projected Value at {retirementAge}</p>
                      <strong>{formatCurrency(projectedRetirementValue)}</strong>
                      <span className="metric-subtext">At {retirementRateOfReturn}% annual return</span>
                    </div>
                  </div>
                </div>

              <div className="retirement-milestones">
                <h4>Retirement Savings Milestones</h4>
                <div className="milestone-list">
                  <div className={`milestone-item ${calculationResult.retirementTracking.currentAge >= 30 ? 'achieved' : 'future'}`}>
                    <span className="milestone-age">Age 30</span>
                    <span className="milestone-target">1x annual household income</span>
                    <span className="milestone-amount">{formatCurrency(calculationResult.retirementTracking.annualIncome * 1)}</span>
                  </div>
                  <div className={`milestone-item ${calculationResult.retirementTracking.currentAge >= 40 ? 'achieved' : 'future'}`}>
                    <span className="milestone-age">Age 40</span>
                    <span className="milestone-target">3x annual household income</span>
                    <span className="milestone-amount">{formatCurrency(calculationResult.retirementTracking.annualIncome * 3)}</span>
                  </div>
                  <div className={`milestone-item ${calculationResult.retirementTracking.currentAge >= 50 ? 'achieved' : 'future'}`}>
                    <span className="milestone-age">Age 50</span>
                    <span className="milestone-target">6x annual household income</span>
                    <span className="milestone-amount">{formatCurrency(calculationResult.retirementTracking.annualIncome * 6)}</span>
                  </div>
                  <div className={`milestone-item ${calculationResult.retirementTracking.currentAge >= 60 ? 'achieved' : 'future'}`}>
                    <span className="milestone-age">Age 60</span>
                    <span className="milestone-target">9x annual household income</span>
                    <span className="milestone-amount">{formatCurrency(calculationResult.retirementTracking.annualIncome * 9)}</span>
                  </div>
                </div>
              </div>

              {calculationResult.retirementTracking.currentAge < calculationResult.retirementTracking.nextMilestoneAge && (
                <div className="retirement-next-goal">
                  <h4>Next Milestone</h4>
                  <p>
                    By age {calculationResult.retirementTracking.nextMilestoneAge}, you should have{' '}
                    <strong>{formatCurrency(calculationResult.retirementTracking.nextMilestoneTarget)}</strong>
                    {' '}({calculationResult.retirementTracking.nextMilestoneMultiplier}x your annual household income)
                  </p>
                  <p className="next-goal-gap">
                    You are only {formatCurrency(Math.max(0, calculationResult.retirementTracking.nextMilestoneTarget - calculationResult.retirementTracking.totalRetirementBalance))} away!
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="retirement-no-data">
              <p>Enter your age on the About Me page to see retirement tracking.</p>
            </div>
          )}
        </section>
      )}

      {/* Financial Order of Operations Step */}
      {currentStep?.key === 'foo' && calculationResult.financialOrderOfOperations && (
        <section aria-label="Financial Order of Operations">
          <div className="foo-header">
            <h3>The Money Guy's Financial Order of Operations (FOO)</h3>
            <p className="foo-subtitle">Yeah I can take no credit for this one. The Money Guy (who are actually two guys) came up with this strategy to maximize every dollar you put into your financial plan. I strongly believe in their methodology and Bo is SO EXCITED for you to follow it. This version is a little less excited than the laminated copy they have but it should work just as well.</p>
            {/* Test button for celebration */}
            {/* <button
              type="button"
              onClick={() => setShowCelebration(true)}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}
            >
              🎉 Test Celebration
            </button> */}
          </div>

          <div className="foo-current-step">
            <div className="current-step-badge">
              Step {calculationResult.financialOrderOfOperations.currentStep}
            </div>
            <h4>
              {calculationResult.financialOrderOfOperations.steps[calculationResult.financialOrderOfOperations.currentStep - 1]?.title}
            </h4>
            <p className="current-step-description">
              {calculationResult.financialOrderOfOperations.steps[calculationResult.financialOrderOfOperations.currentStep - 1]?.description}
            </p>
          </div>

          <div className="foo-steps-list">
            {calculationResult.financialOrderOfOperations.steps.map((step) => (
              <div
                key={step.number}
                className={`foo-step-card ${step.completed ? 'completed' : ''} ${step.number === calculationResult.financialOrderOfOperations.currentStep ? 'current' : ''}`}
              >
                <div className="foo-step-header">
                  <div className="foo-step-number">
                    {step.completed ? (
                      <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span>{step.number}</span>
                    )}
                  </div>
                  <div className="foo-step-info">
                    <h5>{step.title}</h5>
                    <p>{step.description}</p>
                  </div>
                </div>

                <div className="foo-step-details">
                  {step.number === 1 && (
                    <>
                      <div className="detail-row">
                        <span>Total Savings:</span>
                        <strong>{formatCurrency(step.details.totalSavingsBalance)}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Highest Deductible:</span>
                        <strong>{formatCurrency(step.details.highestDeductible)}</strong>
                      </div>
                      {!step.completed && step.details.remaining > 0 && (
                        <div className="detail-row highlight">
                          <span>Still Need:</span>
                          <strong className="status-over">{formatCurrency(step.details.remaining)}</strong>
                        </div>
                      )}
                      {step.completed && (
                        <div className="completion-badge">
                          ✓ "Oh Shit" fund completed!
                        </div>
                      )}
                    </>
                  )}

                  {step.number === 2 && (
                    <>
                      <div className="detail-row">
                        <span>Retirement Accounts with Contributions:</span>
                        <strong>{step.details.totalRetirementContributions}</strong>
                      </div>
                      <div className="detail-row">
                        <span>With Max Match:</span>
                        <strong>{step.details.contributionsWithMaxMatch}</strong>
                      </div>
                      {!step.completed && step.details.totalRetirementContributions > 0 && (
                        <div className="detail-row highlight">
                          <span>Need to maximize:</span>
                          <strong className="status-over">
                            {step.details.totalRetirementContributions - step.details.contributionsWithMaxMatch} account(s)
                          </strong>
                        </div>
                      )}
                      {step.completed && (
                        <div className="completion-badge">
                          ✓ Milking them for all they're worth!
                        </div>
                      )}
                      {step.details.totalRetirementContributions === 0 && (
                        <p className="no-data-message">No retirement contributions set up yet</p>
                      )}
                    </>
                  )}

                  {step.number === 3 && (
                    <>
                      {step.details.highInterestDebts.length > 0 ? (
                        <>
                          <div className="detail-row">
                            <span>High-Interest Debts:</span>
                            <strong className="status-over">{step.details.highInterestDebts.length}</strong>
                          </div>
                          <div className="detail-row">
                            <span>Total Balance:</span>
                            <strong className="status-over">{formatCurrency(step.details.totalHighInterestDebt)}</strong>
                          </div>
                          <div className="high-interest-debt-list">
                            {step.details.highInterestDebts.map((debt) => (
                              <div key={debt.id} className="debt-item">
                                <span>{debt.label}</span>
                                <span>{debt.interestRate.toFixed(2)}% • {formatCurrency(debt.balance)}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="completion-badge">
                          ✓ All debt vampires have been slain!
                        </div>
                      )}
                    </>
                  )}

                  {step.number === 4 && (
                    <>
                      <div className="detail-row">
                        <span>Monthly Needs Expenses:</span>
                        <strong>{formatCurrency(step.details.monthlyNeedsExpenses)}</strong>
                      </div>
                      <div className="detail-row">
                        <span>6-Month Emergency Fund Target:</span>
                        <strong>{formatCurrency(step.details.emergencyFundTarget)}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Current Savings Balance:</span>
                        <strong>{formatCurrency(step.details.totalSavingsBalance)}</strong>
                      </div>
                      {!step.completed && step.details.remaining > 0 && (
                        <div className="detail-row highlight">
                          <span>Still Need:</span>
                          <strong className="status-over">{formatCurrency(step.details.remaining)}</strong>
                        </div>
                      )}
                      {step.completed && (
                        <div className="completion-badge">
                          ✓ Bread has been stacked!
                        </div>
                      )}
                    </>
                  )}

                  {step.number === 5 && (
                    <>
                      <div className="detail-row">
                        <span>Requirement:</span>
                        <strong>{step.details.requirementMessage}</strong>
                      </div>
                      {step.details.hsaRequired && (
                        <>
                          <div className="detail-row">
                            <span>HSA Contributing:</span>
                            <strong className={step.details.isContributingToHSA ? 'status-good' : 'status-over'}>
                              {step.details.isContributingToHSA ? 'Yes ✓' : 'No ✗'}
                            </strong>
                          </div>
                        </>
                      )}
                      <div className="detail-row">
                        <span>Contributing to ROTH IRA:</span>
                        <strong className={step.details.hasRothContributions ? 'status-good' : 'status-over'}>
                          {step.details.hasRothContributions ? 'Yes ✓' : 'No ✗'}
                        </strong>
                      </div>
                      {step.details.totalRothContributions > 0 ? (
                        <>
                          <div className="detail-row">
                            <span>ROTH IRA/HSA Contributions:</span>
                            <strong>{step.details.totalRothContributions}</strong>
                          </div>
                          <div className="detail-row">
                            <span>Monthly Contribution Amount:</span>
                            <strong>{formatCurrency(step.details.monthlyRothAmount)}</strong>
                          </div>
                          <div className="roth-contribution-list">
                            {step.details.rothContributions.map((contrib) => (
                              <div key={contrib.id} className="contribution-item">
                                <span>{contrib.label}</span>
                                <span>{formatCurrency(parseAmount(contrib.monthlyContribution))}/mo</span>
                              </div>
                            ))}
                          </div>
                          {step.completed && (
                            <div className="completion-badge">
                              ✓ Successfully evading taxes (legally)!
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="no-data-message">
                          {step.details.hsaRequired 
                            ? 'Set up ROTH IRA and HSA contributions to pass this step'
                            : 'No ROTH IRA or HSA contributions set up yet. Consider opening these tax-advantaged accounts!'}
                        </div>
                      )}
                    </>
                  )}

                  {step.number === 6 && (
                    <>
                      <div className="detail-row">
                        <span>Retirement On Track:</span>
                        <strong className={step.details.isOnTrack ? 'status-under' : 'status-over'}>
                          {step.details.isOnTrack ? 'Yes ✓' : 'No ✗'}
                        </strong>
                      </div>
                      <div className="detail-row">
                        <span>Monthly Income:</span>
                        <strong>{formatCurrency(step.details.monthlyIncome)}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Retirement Contribution (incl. match):</span>
                        <strong>{formatCurrency(step.details.monthlyRetirementContribution)}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Contribution Percentage (incl. match):</span>
                        <strong className={step.details.retirementContributionPercentage >= 25 ? 'status-under' : 'status-over'}>
                          {step.details.retirementContributionPercentage.toFixed(1)}%
                        </strong>
                      </div>
                      {!step.completed && (
                        <div className="detail-row highlight">
                          <span>Target (25% of monthly income):</span>
                          <strong className="status-over">{formatCurrency(step.details.targetContribution)}</strong>
                        </div>
                      )}
                      {step.completed && (
                        <div className="completion-badge">
                          ✓ Future is flushed!
                        </div>
                      )}
                    </>
                  )}

                  {step.number === 7 && (
                    <>
                      <div className="detail-row">
                        <span>Savings Budget Met:</span>
                        <strong className={step.details.saveBudgetMet ? 'status-under' : 'status-over'}>
                          {step.details.saveBudgetMet ? 'Yes ✓' : 'No ✗'}
                        </strong>
                      </div>
                      <div className="detail-row">
                        <span>Investment Contributions:</span>
                        <strong>{step.details.totalInvestmentContributions}</strong>
                      </div>
                      {step.details.totalInvestmentContributions > 0 && (
                        <>
                          <div className="detail-row">
                            <span>Monthly Investment Amount:</span>
                            <strong>{formatCurrency(step.details.monthlyInvestmentAmount)}</strong>
                          </div>
                          <div className="roth-contribution-list">
                            {step.details.investmentContributions.map((contrib) => (
                              <div key={contrib.id} className="contribution-item">
                                <span>{contrib.label}</span>
                                <span>{formatCurrency(parseAmount(contrib.monthlyContribution))}/mo</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {step.completed && (
                        <div className="completion-badge">
                          ✓ You are on your Wolf of Wall Street shit!
                        </div>
                      )}
                      {!step.completed && !step.details.saveBudgetMet && (
                        <div className="no-data-message">
                          Focus on meeting your savings budget first before buying GME.
                        </div>
                      )}
                      {!step.completed && step.details.saveBudgetMet && step.details.totalInvestmentContributions === 0 && (
                        <div className="no-data-message">
                          Nice work meeting your savings budget! Now add in some individual investing to level up.
                        </div>
                      )}
                    </>
                  )}

                  {step.number === 8 && (
                    <>
                      {step.details.totalSavingsGoals > 0 ? (
                        <>
                          <div className="detail-row">
                            <span>Active Savings Goals:</span>
                            <strong>{step.details.totalSavingsGoals}</strong>
                          </div>
                          <div className="detail-row">
                            <span>Monthly Savings Goal Amount:</span>
                            <strong>{formatCurrency(step.details.monthlySavingsGoalAmount)}</strong>
                          </div>
                          <div className="roth-contribution-list">
                            {step.details.activeSavingsGoals.map((goal) => (
                              <div key={goal.id} className="contribution-item">
                                <span>{goal.label}</span>
                                <span>{formatCurrency(parseAmount(goal.monthlyContribution))}/mo</span>
                              </div>
                            ))}
                          </div>
                          {step.completed && (
                            <div className="completion-badge">
                              ✓ The monsters of the future fear the warriors of the present!
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="no-data-message">
                          Set up savings goals and start contributing to level up.
                        </div>
                      )}
                    </>
                  )}

                  {step.number === 9 && (
                    <>
                      {step.details.totalDebts > 0 ? (
                        <>
                          <div className="detail-row">
                            <span>Remaining Debt Total:</span>
                            <strong className="status-over">{formatCurrency(step.details.totalRemainingDebt)}</strong>
                          </div>
                          <div className="detail-row">
                            <span>Number of Remaining Debt Accounts:</span>
                            <strong>{step.details.totalDebts}</strong>
                          </div>
                          {!step.completed && (
                            <div className="no-data-message">
                              Keep making payments to eliminate all remaining debt and beat the system!
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="completion-badge">
                          ✓ I DON"T OWE NOBODY NOTHING!
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="foo-footer">
            <p>All steps completed? You win! Come back when all steps have been completed for a surprise!</p>
          </div>
        </section>
      )}

      {/* Guidelines Results Step */}
      {currentStep?.key === 'guidelines' && (
        <section aria-label="Guidelines and limits">
          <h3>Guidelines and Limits</h3>
          <div className="guideline-list">
            {guidelines.map((rule) => (
              <article key={rule.id} className={`guideline-item ${rule.passed ? 'pass' : 'fail'}`}>
                <strong>{rule.label}</strong>
                <span>{rule.detail}</span>
              </article>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <p style={{ margin: '0', fontSize: '0.9rem', fontStyle: 'italic', opacity: 0.8 }}>
              💡 Does this page seem out of place? That's because it is! This will be overhauled into a new feature called insights, stay tuned!
            </p>
          </div>
        </section>
      )}

      {/* Dashboard - Overview of all results */}
      {currentStep?.key === 'dashboard' && (
        <div className="dashboard-overview">
          {showBudgetResults && (
            <section className="dashboard-section" aria-label="Budget summary">
              <h3>Budget Summary</h3>
              <div className="summary-metrics">
                <div className="metric-card">
                  <p>Monthly Income</p>
                  <strong>{formatCurrency(calculationResult.monthlyIncome)}</strong>
                </div>
                <div className="metric-card">
                  <p>Total Expenses</p>
                  <strong>{formatCurrency(calculationResult.totalExpenses)}</strong>
                </div>
                <div className="metric-card">
                  <p>Remaining</p>
                  <strong>{formatCurrency(calculationResult.monthlyIncome - calculationResult.totalExpenses)}</strong>
                </div>
              </div>
              <div className="dashboard-categories">
                {calculationResult.categorySummaries.map((item) => (
                  <div key={item.category} className="dashboard-category-item">
                    <span>{item.label}</span>
                    <span className={
                      item.category === 'save'
                        ? (item.status === 'Under Budget' ? 'status-over' : item.status === 'Over Budget' ? 'status-under' : 'status-at')
                        : (item.status === 'Over Budget' ? 'status-over' : item.status === 'Under Budget' ? 'status-under' : 'status-at')
                    }>
                      {formatCurrency(item.actual)} / {formatCurrency(item.budget)}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="dashboard-detail-btn"
                onClick={() => handleJumpToStep(steps.findIndex(s => s.key === 'budget'))}
              >
                View Budget Details →
              </button>
            </section>
          )}

          {showDebtResults && totalDebtPayoffSummary && (
            <section className="dashboard-section" aria-label="Debt summary">
              <h3>Debt Payoff Summary</h3>
              <div className="summary-metrics">
                <div className="metric-card">
                  <p>Payoff Time</p>
                  <strong>{totalDebtPayoffSummary.totalTime}</strong>
                </div>
                <div className="metric-card">
                  <p>Debt-Free By</p>
                  <strong>{totalDebtPayoffSummary.paidOffBy}</strong>
                </div>
              </div>
              <div className="dashboard-debt-list">
                {payoffTimeline.slice(0, 3).map((debt) => (
                  <div key={debt.id} className="dashboard-debt-item">
                    <span>{debt.label}</span>
                    <span>{debt.payoffText}</span>
                  </div>
                ))}
                {payoffTimeline.length > 3 && (
                  <p className="dashboard-more">+{payoffTimeline.length - 3} more</p>
                )}
              </div>
              <button
                type="button"
                className="dashboard-detail-btn"
                onClick={() => handleJumpToStep(steps.findIndex(s => s.key === 'debt'))}
              >
                View Debt Details →
              </button>
            </section>
          )}

          {showSavingsResults && calculationResult.savingsProjection && calculationResult.savingsProjection.totalGoals > 0 && (
            <section className="dashboard-section" aria-label="Savings summary">
              <h3>Savings Projections</h3>
              <div className="summary-metrics">
                <div className="metric-card">
                  <p>Monthly Savings</p>
                  <strong>{formatCurrency(calculationResult.savingsProjection.monthlySavingsContribution)}</strong>
                </div>
                <div className="metric-card">
                  <p>Total Goals</p>
                  <strong>{calculationResult.savingsProjection.totalGoals}</strong>
                </div>
              </div>
              <div className="dashboard-savings-list">
                {calculationResult.savingsProjection.timeline.slice(0, 3).map((goal) => {
                  const monthsToComplete = goal.monthsToComplete;
                  const isInfinite = monthsToComplete === Infinity;
                  const years = Math.floor(monthsToComplete / 12);
                  const months = monthsToComplete % 12;
                  const timeLabel = goal.alreadyFunded 
                    ? 'Funded' 
                    : isInfinite
                      ? '\u221e'
                      : years > 0 
                        ? `${years}y ${months}m` 
                        : `${months}m`;

                  return (
                    <div key={goal.id} className="dashboard-savings-item">
                      <span>{goal.label}</span>
                      <span>{timeLabel}</span>
                    </div>
                  );
                })}
                {calculationResult.savingsProjection.timeline.length > 3 && (
                  <p className="dashboard-more">+{calculationResult.savingsProjection.timeline.length - 3} more</p>
                )}
              </div>
              <button
                type="button"
                className="dashboard-detail-btn"
                onClick={() => handleJumpToStep(steps.findIndex(s => s.key === 'savings'))}
              >
                View Savings Details →
              </button>
            </section>
          )}

          {showNetWorthResults && (
            <section className="dashboard-section" aria-label="Net worth summary">
              <h3>Net Worth</h3>
              <div className="summary-metrics">
                <div className="metric-card">
                  <p>Net Worth</p>
                  <strong className={netWorthData.netWorth >= 0 ? 'positive' : 'negative'}>
                    {formatCurrency(netWorthData.netWorth)}
                  </strong>
                </div>
                <div className="metric-card">
                  <p>Total Assets</p>
                  <strong>{formatCurrency(netWorthData.totalAssets)}</strong>
                </div>
                <div className="metric-card">
                  <p>Total Debts</p>
                  <strong>{formatCurrency(netWorthData.totalDebts)}</strong>
                </div>
              </div>
              <button
                type="button"
                className="dashboard-detail-btn"
                onClick={() => handleJumpToStep(steps.findIndex(s => s.key === 'networth'))}
              >
                View Net Worth Details →
              </button>
            </section>
          )}

          {showRetirementResults && calculationResult.retirementTracking && calculationResult.retirementTracking.currentAge > 0 && (
            <section className="dashboard-section" aria-label="Retirement summary">
              <h3>Retirement Tracking</h3>
              <div className="summary-metrics">
                <div className="metric-card">
                  <p>Current Savings</p>
                  <strong>{formatCurrency(calculationResult.retirementTracking.totalRetirementBalance)}</strong>
                </div>
                <div className="metric-card">
                  <p>Target (Age {calculationResult.retirementTracking.currentAge})</p>
                  <strong>{formatCurrency(calculationResult.retirementTracking.retirementTarget)}</strong>
                </div>
                <div className="metric-card">
                  <p>Status</p>
                  <strong className={calculationResult.retirementTracking.isOnTrack ? 'positive' : 'negative'}>
                    {calculationResult.retirementTracking.isOnTrack ? 'On Track' : 'Behind'}
                  </strong>
                </div>
              </div>
              {calculationResult.retirementTracking.yearsToRetirement > 0 && (
                <div className="dashboard-retirement-projection">
                  <p>
                    Projected at 65: <strong>{formatCurrency(calculationResult.retirementTracking.projectedRetirementValue)}</strong>
                  </p>
                  <p className="projection-note">
                    Based on {retirementRateOfReturn}% annual return
                  </p>
                </div>
              )}
              <button
                type="button"
                className="dashboard-detail-btn"
                onClick={() => handleJumpToStep(steps.findIndex(s => s.key === 'retirement'))}
              >
                View Retirement Details →
              </button>
            </section>
          )}

          {showFOOResults && calculationResult.financialOrderOfOperations && (
            <section className="dashboard-section" aria-label="Financial Order of Operations summary">
              <h3>Financial Order of Operations</h3>
              <div className="foo-dashboard-status">
                <div className="foo-dashboard-current">
                  <span className="dashboard-step-badge">Step {calculationResult.financialOrderOfOperations.currentStep}</span>
                  <strong>
                    {calculationResult.financialOrderOfOperations.steps[calculationResult.financialOrderOfOperations.currentStep - 1]?.title}
                  </strong>
                </div>
                <div className="foo-dashboard-progress">
                  {calculationResult.financialOrderOfOperations.steps.map((step) => (
                    <div
                      key={step.number}
                      className={`foo-progress-dot ${step.completed ? 'completed' : ''} ${step.number === calculationResult.financialOrderOfOperations.currentStep ? 'current' : ''}`}
                      title={step.title}
                    >
                      {step.number}
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="dashboard-detail-btn"
                onClick={() => handleJumpToStep(steps.findIndex(s => s.key === 'foo'))}
              >
                View Order of Operations →
              </button>
            </section>
          )}

          {showGuidelinesResults && (
            <section className="dashboard-section" aria-label="Guidelines summary">
              <h3>Financial Guidelines</h3>
              <div className="dashboard-guidelines">
                {guidelines.map((rule) => (
                  <div key={rule.id} className={`dashboard-guideline-item ${rule.passed ? 'pass' : 'fail'}`}>
                    <span>{rule.passed ? '✓' : '✗'}</span>
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="dashboard-detail-btn"
                onClick={() => handleJumpToStep(steps.findIndex(s => s.key === 'guidelines'))}
              >
                View Guidelines Details →
              </button>
            </section>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="results-navigation">
        <button
          type="button"
          className="results-nav-btn prev"
          onClick={handlePrevious}
          disabled={isFirstStep}
        >
          ← Previous
        </button>
        <span className="results-step-indicator">
          {clampedActiveStep + 1} / {steps.length}
        </span>
        {currentStep?.key !== 'dashboard' && (
          <button
            type="button"
            className="results-nav-btn next"
            onClick={handleNext}
            disabled={isLastStep}
          >
            Next →
          </button>
        )}
      </div>
    </section>
  );
}

export default ResultsPanel;
