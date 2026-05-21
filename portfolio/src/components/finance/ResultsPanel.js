import React from 'react';

function ResultsPanel({
  calculationResult,
  showBudgetResults,
  showDebtResults,
  showNetWorthResults,
  showGuidelinesResults,
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
  onEditInputs
}) {
  return (
    <section className="results-panel relative rounded-2xl border border-emerald-100/80 bg-white/92 shadow-glow backdrop-blur-sm" aria-label="Budget results">
      <div className="results-header">
        <h2>Budget Breakdown</h2>
        <button
          type="button"
          className="add-field-btn"
          onClick={onEditInputs}
        >
          Edit Inputs
        </button>
      </div>

      {showBudgetResults && calculationResult.warnings && calculationResult.warnings.length > 0 && (
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

      {showBudgetResults && (
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
      )}

      {showBudgetResults && (
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
      )}

      {showBudgetResults && (
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
      )}

      {showDebtResults && (
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
            <label className="inline-checkbox">
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
      )}

      {showNetWorthResults && (
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
      )}

      {showGuidelinesResults && (
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
      )}
    </section>
  );
}

export default ResultsPanel;
