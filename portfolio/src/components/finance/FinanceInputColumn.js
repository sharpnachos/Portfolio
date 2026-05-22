import React from 'react';

function FinanceInputColumn({
  title,
  values,
  setter,
  inputPrefix,
  buttonText,
  editingItemId,
  draftLabel,
  setDraftLabel,
  saveEditingLabel,
  cancelEditingLabel,
  startEditingLabel,
  activeAmountField,
  setActiveAmountField,
  activeRateField,
  setActiveRateField,
  formatCurrencyDisplay,
  formatPercentDisplay,
  updateFieldAmountByKey,
  updateDebtField,
  updateAssetField,
  sanitizeDecimalInput,
  updateFieldValue,
  updateFieldFrequency,
  updateFieldCategory,
  updateAssetType,
  updateFieldBooleanByKey,
  removeField,
  addField
}) {
  return (
    <section className="finance-column rounded-2xl border border-emerald-100/80 bg-white/90 shadow-glow backdrop-blur-sm" aria-label={`${title} column`}>
      <h2>{title}</h2>
      <div className="field-list">
        {values.length === 0 && title === 'Contributions' && (
          <p className="field-help-text">Mark assets as actively contributing to create contribution rows.</p>
        )}
        {values.map((item, index) => {
          const fieldId = `${inputPrefix}-${item.id}`;
          const isRetirementContribution = title === 'Contributions' && (item.assetType || '').toLowerCase() === 'retirement account';

          return (
            <div className="field-row" key={fieldId}>
              {title === 'Contributions' ? (
                <span className="item-title-static">{item.label}</span>
              ) : editingItemId === item.id ? (
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
                  disabled={item.isDebtPayment}
                  title={item.isDebtPayment ? 'Debt payment name is set from the Debt page' : 'Click to edit'}
                  style={item.isDebtPayment ? { cursor: 'default', opacity: 0.7 } : {}}
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
                    <select
                      className="frequency-select"
                      value={item.debtType || 'other'}
                      onChange={(event) => updateDebtField(setter, values, index, 'debtType', event.target.value)}
                      aria-label={`${item.label} debt type`}
                    >
                      <option value="mortgage">Mortgage</option>
                      <option value="auto loan">Auto loan</option>
                      <option value="student loan">Student loan</option>
                      <option value="personal loan">Personal loan</option>
                      <option value="credit card debt">Credit card debt</option>
                      <option value="medical debt">Medical debt</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                ) : title !== 'Contributions' ? (
                  <input
                    id={fieldId}
                    type="text"
                    inputMode="decimal"
                    value={activeAmountField === fieldId ? item.value : formatCurrencyDisplay(item.value)}
                    placeholder={`Enter ${item.label.toLowerCase()} amount`}
                    onFocus={() => setActiveAmountField(fieldId)}
                    onBlur={() => setActiveAmountField(null)}
                    onChange={(event) => updateFieldValue(setter, values, index, event.target.value)}
                    disabled={item.isDebtPayment}
                    title={item.isDebtPayment ? 'Debt payment amount is set from the Debt page' : ''}
                  />
                ) : null}
                {title === 'Income' && (
                  <select
                    className="frequency-select"
                    value={item.frequency || 'biweekly'}
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
                    disabled={item.isDebtPayment}
                    title={item.isDebtPayment ? 'Debt payments are always in the Needs category' : ''}
                  >
                    <option value="needs">Needs</option>
                    <option value="wants">Wants</option>
                    <option value="save">Save</option>
                  </select>
                )}
                {title === 'Expenses' && item.category === 'save' && (
                  <div className="checkbox-row">
                    <label className="inline-checkbox" htmlFor={`${fieldId}-addl-debt-payment`}>
                      <input
                        id={`${fieldId}-addl-debt-payment`}
                        type="checkbox"
                        checked={Boolean(item.addlDebtPayment)}
                        onChange={(event) => updateFieldBooleanByKey(setter, values, index, 'addlDebtPayment', event.target.checked)}
                      />
                      Addl. debt payment?
                    </label>
                  </div>
                )}
                {title === 'Assets' && (item.assetType || '').toLowerCase() === 'savings account' && (
                  <input
                    id={`${fieldId}-interest`}
                    type="text"
                    inputMode="decimal"
                    className="interest-rate-input"
                    value={activeRateField === `${fieldId}-interest` ? (item.interestRate || '') : formatPercentDisplay(item.interestRate)}
                    placeholder="Interest %"
                    onFocus={() => setActiveRateField(`${fieldId}-interest`)}
                    onBlur={() => setActiveRateField(null)}
                    onChange={(event) => updateAssetField(setter, values, index, 'interestRate', sanitizeDecimalInput(event.target.value))}
                    aria-label={`${item.label} interest rate`}
                  />
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
                {title === 'Assets' &&
                  ['savings account', 'investment account', 'retirement account'].includes((item.assetType || '').toLowerCase()) && (
                  <div className="checkbox-row">
                    <label className="inline-checkbox" htmlFor={`${fieldId}-active-contribution`}>
                      <input
                        id={`${fieldId}-active-contribution`}
                        type="checkbox"
                        checked={Boolean(item.activelyContributing)}
                        onChange={(event) => updateFieldBooleanByKey(setter, values, index, 'activelyContributing', event.target.checked)}
                      />
                      Actively contributing?
                    </label>
                  </div>
                )}
                {title === 'Contributions' && (
                  <div className="contribution-controls" aria-label={`${item.label} contribution details`}>
                    <input
                      id={`${fieldId}-monthly`}
                      type="text"
                      inputMode="decimal"
                      value={activeAmountField === `${fieldId}-monthly` ? (item.monthlyContribution || '') : formatCurrencyDisplay(item.monthlyContribution)}
                      placeholder="Contribution amount"
                      onFocus={() => setActiveAmountField(`${fieldId}-monthly`)}
                      onBlur={() => setActiveAmountField(null)}
                      onChange={(event) => updateFieldAmountByKey(setter, values, index, 'monthlyContribution', event.target.value)}
                    />
                    <select
                      className="frequency-select"
                      value={item.frequency || 'monthly'}
                      onChange={(event) => updateFieldFrequency(setter, values, index, event.target.value)}
                      aria-label={`${item.label} contribution frequency`}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <label className="inline-checkbox" htmlFor={`${fieldId}-deducted-from-pay`}>
                      <input
                        id={`${fieldId}-deducted-from-pay`}
                        type="checkbox"
                        checked={Boolean(item.deductedFromPay)}
                        onChange={(event) => updateFieldBooleanByKey(setter, values, index, 'deductedFromPay', event.target.checked)}
                      />
                      Deducted from pay
                    </label>
                    {isRetirementContribution && (
                      <>
                        <input
                          id={`${fieldId}-match`}
                          type="text"
                          inputMode="decimal"
                          value={activeRateField === `${fieldId}-match` ? (item.matchPercentage || '') : formatPercentDisplay(item.matchPercentage)}
                          placeholder="Employer match %"
                          onFocus={() => setActiveRateField(`${fieldId}-match`)}
                          onBlur={() => setActiveRateField(null)}
                          onChange={(event) => updateFieldAmountByKey(setter, values, index, 'matchPercentage', event.target.value)}
                        />
                        <label className="inline-checkbox" htmlFor={`${fieldId}-max-match`}>
                          <input
                            id={`${fieldId}-max-match`}
                            type="checkbox"
                            checked={Boolean(item.maxMatchAchieved)}
                            onChange={(event) => updateFieldBooleanByKey(setter, values, index, 'maxMatchAchieved', event.target.checked)}
                          />
                          Max match achieved
                        </label>
                      </>
                    )}
                  </div>
                )}
                {title !== 'Contributions' && !item.isDebtPayment && (
                  <button
                    type="button"
                    className="remove-field-btn"
                    onClick={() => removeField(setter, values, index)}
                    disabled={values.length === 1}
                    aria-label={`Remove ${item.label}`}
                    title={`Remove ${item.label}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                      <rect x="5.5" y="8.5" width="1.5" height="6" rx="0.75" fill="currentColor"/>
                      <rect x="9.25" y="8.5" width="1.5" height="6" rx="0.75" fill="currentColor"/>
                      <rect x="13" y="8.5" width="1.5" height="6" rx="0.75" fill="currentColor"/>
                      <path d="M3 5.5H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <rect x="6" y="3" width="8" height="2.5" rx="1.25" fill="currentColor"/>
                      <rect x="4.5" y="5.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {title !== 'Contributions' && (
        <button
          type="button"
          className="add-field-btn add-income-btn"
          style={{ display: 'block', margin: '0 auto', width: '33%', minWidth: 60, maxWidth: 120, textAlign: 'center' }}
          onClick={() => addField(title, setter, values)}
        >
          {buttonText}
        </button>
      )}
    </section>
  );
}

export default FinanceInputColumn;
