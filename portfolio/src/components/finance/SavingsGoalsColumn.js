import React, { useState } from 'react';
import { createSavingsGoalItem } from './financeHelpers';

function SavingsGoalsColumn({
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
  formatCurrencyDisplay,
  updateFieldAmountByKey,
}) {
  const [draggedGoalId, setDraggedGoalId] = useState(null);

  const normalizePriorities = (items) => items.map((entry, index) => ({
    ...entry,
    priority: index + 1
  }));

  const moveGoal = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }

    const nextValues = [...values];
    const [movedGoal] = nextValues.splice(fromIndex, 1);
    nextValues.splice(toIndex, 0, movedGoal);
    setter(normalizePriorities(nextValues));
  };

  return (
    <section className="finance-column rounded-2xl border border-emerald-100/80 bg-white/90 shadow-glow backdrop-blur-sm" aria-label="Savings Goals column">
      <h2>Savings Goals</h2>
      <p className="field-help-text" style={{ marginBottom: '1rem', padding: '0 1rem', opacity: 0.8 }}>
        You saving up for something big? Down Payment on a house? Fancy vacation? That{' '}
        <a 
          href="https://www.alibaba.com/product-detail/Inflatable-Cartoon-Characters-Plush-Toy-Chair_1601583814521.html?mark=google_shopping&pcy=us_en&src=sem_ggl&field=UG&from=sem_ggl&cmpgn=22447501333&adgrp=179561022882&fditm=&tgt=pla-1989436419253&locintrst=&locphyscl=9021428&mtchtyp=&ntwrk=g&device=c&dvcmdl=&creative=746287692655&plcmnt=&plcmntcat=&aceid=&position=&gad_source=1&gad_campaignid=22447501333&gbraid=0AAAAAD8m77qqUgfIDmqGcHjn03eDVnPh6&gclid=Cj0KCQjwoMXQBhDcARIsAH-eEtvRRAicvn9KaudBSLG0WnhPhACxWg-6T5ISMfkkSHa0xHcnno8VWx8aAhVeEALw_wcB"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#16a34a', textDecoration: 'underline' }}
        >
          Alibaba gorilla couch
        </a>
        ? Add those goals here and we can factor them into your savings timeline.
      </p>
      <div className="field-list">
        {values.map((item, index) => {
          const fieldId = `${inputPrefix}-${item.id}`;

          return (
            <div
              className={`field-row savings-goal-row ${draggedGoalId === item.id ? 'dragging' : ''}`}
              key={fieldId}
              draggable={values.length > 1}
              onDragStart={(event) => {
                if (values.length <= 1) {
                  return;
                }
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', item.id);
                setDraggedGoalId(item.id);
              }}
              onDragEnd={() => setDraggedGoalId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                const fromIndex = values.findIndex((entry) => entry.id === draggedGoalId);
                moveGoal(fromIndex, index);
                setDraggedGoalId(null);
              }}
            >
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
                {values.length > 1 && (
                  <button
                    type="button"
                    className="drag-goal-btn"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', item.id);
                      setDraggedGoalId(item.id);
                    }}
                    onDragEnd={() => setDraggedGoalId(null)}
                    aria-label={`Drag to reorder ${item.label}`}
                    title={`Drag to reorder ${item.label}`}
                  >
                    <span aria-hidden="true">::</span>
                  </button>
                )}
                {values.length > 1 && (
                  <span className="savings-goal-priority" aria-label={`${item.label} priority ${item.priority || index + 1}`}>
                    {item.priority || index + 1}
                  </span>
                )}
                <input
                  id={`${fieldId}-saved`}
                  type="text"
                  inputMode="decimal"
                  value={activeAmountField === `${fieldId}-saved` ? (item.amountSaved || '') : formatCurrencyDisplay(item.amountSaved)}
                  placeholder="Amount already saved"
                  onFocus={() => setActiveAmountField(`${fieldId}-saved`)}
                  onBlur={() => setActiveAmountField(null)}
                  onChange={(event) => updateFieldAmountByKey(setter, values, index, 'amountSaved', event.target.value)}
                />
                <input
                  id={`${fieldId}-needed`}
                  type="text"
                  inputMode="decimal"
                  value={activeAmountField === `${fieldId}-needed` ? (item.amountNeeded || '') : formatCurrencyDisplay(item.amountNeeded)}
                  placeholder="Amount needed to save"
                  onFocus={() => setActiveAmountField(`${fieldId}-needed`)}
                  onBlur={() => setActiveAmountField(null)}
                  onChange={(event) => updateFieldAmountByKey(setter, values, index, 'amountNeeded', event.target.value)}
                />
                <button
                  type="button"
                  className="remove-field-btn"
                  onClick={() => setter(normalizePriorities(values.filter((_, itemIndex) => itemIndex !== index)))}
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
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="add-field-btn add-income-btn"
        style={{ display: 'block', margin: '0 auto', width: '33%', minWidth: 60, maxWidth: 120, textAlign: 'center' }}
        onClick={() => setter(normalizePriorities([
          ...values,
          createSavingsGoalItem(`Goal ${values.length + 1}`, values.length + 1)
        ]))}
      >
        {buttonText}
      </button>
    </section>
  );
}

export default SavingsGoalsColumn;