import React, { useState, useRef, useEffect } from 'react';

function AboutMeColumn({
  aboutMe,
  updateAboutMeField,
  activeAmountField,
  setActiveAmountField,
  formatCurrencyDisplay,
  sanitizeDecimalInput
}) {
  const [showDeductibleInfo, setShowDeductibleInfo] = useState(false);
  const [showHDHPInfo, setShowHDHPInfo] = useState(false);
  const [showIncomeInfo, setShowIncomeInfo] = useState(false);
  const infoPopupRef = useRef(null);
  const hdhpPopupRef = useRef(null);
  const incomePopupRef = useRef(null);

  // Handle click outside to close popups
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDeductibleInfo && infoPopupRef.current && !infoPopupRef.current.contains(event.target)) {
        setShowDeductibleInfo(false);
      }
      if (showHDHPInfo && hdhpPopupRef.current && !hdhpPopupRef.current.contains(event.target)) {
        setShowHDHPInfo(false);
      }
      if (showIncomeInfo && incomePopupRef.current && !incomePopupRef.current.contains(event.target)) {
        setShowIncomeInfo(false);
      }
    };

    if (showDeductibleInfo || showHDHPInfo || showIncomeInfo) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeductibleInfo, showHDHPInfo, showIncomeInfo]);

  return (
    <section className="finance-column rounded-2xl border border-emerald-100/80 bg-white/90 shadow-glow backdrop-blur-sm" aria-label="About Me column">
      <h2>About You</h2>
      <p className="field-help-text" style={{ marginBottom: '1rem', padding: '0 1rem', opacity: 0.8 }}>
        First some questions about yourself, these will be used to determine if you are on track for retirement, and what financial step you are on.
      </p>
      <div className="field-list">
        <div className="field-row">
          <span className="item-title-static">How old are you?</span>
          <div className="field-controls">
            <input
              id="about-me-age"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={aboutMe.age}
              placeholder="Enter age"
              onChange={(event) => {
                const val = event.target.value.replace(/[^0-9]/g, '');
                updateAboutMeField('age', val);
              }}
            />
          </div>
        </div>

        <div className="field-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
            <span className="item-title-static">What is your highest deductible?</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeductibleInfo(!showDeductibleInfo);
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
              aria-label="More information about deductibles"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </button>
            {showDeductibleInfo && (
              <div
                ref={infoPopupRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  marginTop: '0.5rem',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  zIndex: 1000,
                  minWidth: '300px',
                  maxWidth: '400px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: '0', fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>About Deductibles</h4>
                  <button
                    type="button"
                    onClick={() => setShowDeductibleInfo(false)}
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
                <p style={{ margin: '0', fontSize: '0.85rem', color: '#4b5563', lineHeight: '1.5' }}>
                  Despite you paying your insurance company every month, they have deductibles. Which is a specified amount of money you must pay out of pocket before insurance kicks in. Bullshit, I know, but it's the system we live in. Check your health, auto, and home/renters insurance policies and enter whatever the highest deductible amount is.
                </p>
              </div>
            )}
          </div>
          <div className="field-controls">
            <input
              id="about-me-highest-deductible"
              type="text"
              inputMode="decimal"
              pattern="^[0-9]*[.,]?[0-9]*$"
              value={activeAmountField === 'about-me-highest-deductible' ? aboutMe.highestDeductible : formatCurrencyDisplay(aboutMe.highestDeductible)}
              placeholder="Enter highest deductible"
              onFocus={() => setActiveAmountField('about-me-highest-deductible')}
              onBlur={() => {
                setActiveAmountField(null);
                if (aboutMe.highestDeductible !== '' && !isNaN(Number(aboutMe.highestDeductible))) {
                  updateAboutMeField('highestDeductible', Number(aboutMe.highestDeductible).toFixed(2));
                }
              }}
              onChange={(event) => {
                // Allow only numbers and decimals
                let val = event.target.value.replace(/[^0-9.]/g, '');
                // Only one decimal point
                val = val.replace(/(\..*)\./g, '$1');
                updateAboutMeField('highestDeductible', val);
              }}
            />
          </div>
        </div>

        <div className="field-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
            <span className="item-title-static">Do you have a High-Deductible Health Plan (HDHP)?</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowHDHPInfo(!showHDHPInfo);
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
              aria-label="More information about HDHP"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </button>
            {showHDHPInfo && (
              <div
                ref={hdhpPopupRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  marginTop: '0.5rem',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  zIndex: 1000,
                  minWidth: '300px',
                  maxWidth: '400px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: '0', fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>High-Deductible Health Plan (HDHP)</h4>
                  <button
                    type="button"
                    onClick={() => setShowHDHPInfo(false)}
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
                <p style={{ margin: '0', fontSize: '0.85rem', color: '#4b5563', lineHeight: '1.5' }}>
                  A High-Deductible Health Plan (HDHP) is a health insurance plan where you are deductiblemaxxing and your premiums are super low. If you have an HDHP, you have access to potentially the best retirement account possible. Your contributions can be invested, you pay no takes on the money you contribute to this account, you pay no taxes on growth, and you pay no withdrawal tax after age 59.5. Fuck taxes!
                </p>
              </div>
            )}
          </div>
          <div className="field-controls">
            <label className="inline-checkbox" htmlFor="about-me-hdhp">
              <input
                id="about-me-hdhp"
                type="checkbox"
                checked={Boolean(aboutMe.hasHighDeductiblePlan)}
                onChange={(event) => updateAboutMeField('hasHighDeductiblePlan', event.target.checked)}
              />
              Yes
            </label>
          </div>
        </div>

        <div className="field-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
            <span className="item-title-static">What is your Household Gross Annual Income?</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowIncomeInfo(!showIncomeInfo);
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
              aria-label="More information about gross annual income"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </button>
            {showIncomeInfo && (
              <div
                ref={incomePopupRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  marginTop: '0.5rem',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  zIndex: 1000,
                  minWidth: '300px',
                  maxWidth: '400px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: '0', fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>Household Gross Annual Income</h4>
                  <button
                    type="button"
                    onClick={() => setShowIncomeInfo(false)}
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
                <p style={{ margin: '0', fontSize: '0.85rem', color: '#4b5563', lineHeight: '1.5' }}>
                  This is all the bread you and your fam stack in a year before taxes. This includes your salary, your partner's salary, any side hustle income, and any other income that comes in.
                </p>
              </div>
            )}
          </div>
          <div className="field-controls">
            <input
              id="about-me-annual-income"
              type="text"
              inputMode="decimal"
              pattern="^[0-9]*[.,]?[0-9]*$"
              value={activeAmountField === 'about-me-annual-income' ? aboutMe.householdGrossAnnualIncome : formatCurrencyDisplay(aboutMe.householdGrossAnnualIncome)}
              placeholder="Enter annual income"
              onFocus={() => setActiveAmountField('about-me-annual-income')}
              onBlur={() => {
                setActiveAmountField(null);
                if (aboutMe.householdGrossAnnualIncome !== '' && !isNaN(Number(aboutMe.householdGrossAnnualIncome))) {
                  updateAboutMeField('householdGrossAnnualIncome', Number(aboutMe.householdGrossAnnualIncome).toFixed(2));
                }
              }}
              onChange={(event) => {
                // Allow only numbers and decimals
                let val = event.target.value.replace(/[^0-9.]/g, '');
                // Only one decimal point
                val = val.replace(/(\..*)\./, '$1');
                updateAboutMeField('householdGrossAnnualIncome', val);
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutMeColumn;
