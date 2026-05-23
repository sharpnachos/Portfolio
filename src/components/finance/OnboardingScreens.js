import React, { useState, useEffect } from 'react';

const tMoneySayings = [
  "Having money isn't everything, not having it is! 💸",
  "50 told me go head switch the style up, and if they hate then let em hate and watch the money pile up! 🤑",
  "You little fuck I got money stacks bigger than you.",
  "Half a mil' in twenties like a billion where I'm from.",
  "CASH RULES EVERYTHING AROUND ME. C.R.E.A.M. GET THE MONEY. DOLLA DOLLA BILL YA'LL",
  "I ain't Curren$y but if there ain't money in my name",
  "Money trees is the perfect place for shade and that's just how I feel. 💰",
  "A dollar might turn to a million and we all rich that's just how I feel",
  "shit they say the best things in life are free!",
  "I got 1-2-3-4-5-6-7-8 M's in my back account, yeah (on God)"
];

function OnboardingScreens({
  hasStarted,
  setHasStarted,
  showHousingChooser,
  setShowHousingChooser,
  showCarLoansChooser,
  setShowCarLoansChooser,
  showWelcomeBack,
  setShowWelcomeBack,
  handleCalculate,
  housingInfo,
  updateHousingInfo,
  handleHousingPaidOffToggle,
  canContinueHousing,
  handleHousingContinue,
  carLoansInfo,
  updateCarLoansInfo,
  updateCarLoan,
  addCarLoan,
  removeCarLoan,
  canContinueCarLoans,
  handleCarLoansContinue,
  calculationResult
}) {
  const [activeHousingField, setActiveHousingField] = useState(null);
  const [activeCarLoanField, setActiveCarLoanField] = useState(null);
  const [editingCarLoanId, setEditingCarLoanId] = useState(null);
  const [draftCarLoanName, setDraftCarLoanName] = useState('');
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [currentSaying, setCurrentSaying] = useState('');

  // T-Money Easter Egg: Random speech bubble every 5-30 minutes
  useEffect(() => {
    if (!hasStarted) {
      return;
    }

    let bubbleTimeoutId;
    let hideTimeoutId;

    const scheduleNextBubble = () => {
      // Random time between 5-30 minutes (in milliseconds)
      const minTime = 5 * 60 * 1000; // 5 minutes
      const maxTime = 30 * 60 * 1000; // 30 minutes
      const randomTime = Math.random() * (maxTime - minTime) + minTime;

      bubbleTimeoutId = setTimeout(() => {
        // Pick a random saying
        const randomSaying = tMoneySayings[Math.floor(Math.random() * tMoneySayings.length)];
        setCurrentSaying(randomSaying);
        setShowSpeechBubble(true);

        // Hide after 10 seconds
        hideTimeoutId = setTimeout(() => {
          setShowSpeechBubble(false);
        }, 10000);

        // Schedule next bubble
        scheduleNextBubble();
      }, randomTime);
    };

    scheduleNextBubble();

    return () => {
      clearTimeout(bubbleTimeoutId);
      clearTimeout(hideTimeoutId);
    };
  }, [hasStarted]);

  const parseNumeric = (rawValue) => {
    const normalized = String(rawValue ?? '').replace(/[^0-9.-]/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatCurrencyDisplay = (rawValue) => {
    if (!rawValue) {
      return '';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseNumeric(rawValue));
  };

  const formatPercentDisplay = (rawValue) => {
    if (!rawValue) {
      return '';
    }

    return `${parseNumeric(rawValue).toFixed(2)}%`;
  };

  const startEditingCarLoanName = (loan) => {
    setEditingCarLoanId(loan.id);
    setDraftCarLoanName(loan.name || '');
  };

  const saveCarLoanName = (loanId) => {
    const trimmedName = draftCarLoanName.trim();
    if (trimmedName) {
      updateCarLoan(loanId, 'name', trimmedName);
    }
    setEditingCarLoanId(null);
    setDraftCarLoanName('');
  };

  const cancelEditingCarLoanName = () => {
    setEditingCarLoanId(null);
    setDraftCarLoanName('');
  };

  return (
    <>
      {hasStarted && (
        <div className="tmoney-brand-container">
          <button
            type="button"
            className="tmoney-brand"
            aria-label="T-Money's $$$ Toolbox"
            onClick={() => {
              setHasStarted(false);
              setShowHousingChooser(false);
              setShowCarLoansChooser(false);
              // Check if localStorage has saved data to show welcome back
              const savedData = localStorage.getItem('t-money-toolbox-calculator-data');
              setShowWelcomeBack(savedData ? true : false);
            }}
          >
            <span className="tmoney-brand-emoji" aria-hidden="true">💸</span>
            <span className="tmoney-brand-text">T-Money's $$$ Toolbox</span>
          </button>
          {showSpeechBubble && (
            <div className="tmoney-speech-bubble">
              <div className="speech-bubble-content">
                <strong>T-Money $$$ says:</strong> {currentSaying}
              </div>
            </div>
          )}
        </div>
      )}

      {!hasStarted && !showWelcomeBack && !showHousingChooser && !showCarLoansChooser && (
        <section className="intro-screen" aria-label="Introduction">
          <h1 className="intro-title">Hey!</h1>
          <p className="intro-copy">Welcome to T-Money's $$$ Toolbox! Pull up all your financial information because we are about to dive deep!</p>
          <button
            type="button"
            className="intro-start-btn"
            onClick={() => setShowHousingChooser(true)}
          >
            Start <span aria-hidden="true">→</span>
          </button>
        </section>
      )}

      {!hasStarted && showWelcomeBack && (
        <section className="intro-screen" aria-label="Welcome Back">
          <h1 className="intro-title">Welcome Back!</h1>
          <p className="intro-copy">We've saved your previous data. Click below to view your results or start fresh.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="intro-start-btn"
              onClick={() => {
                setShowWelcomeBack(false);
                setHasStarted(true);
                // Trigger calculation with loaded data
                setTimeout(() => handleCalculate(), 100);
              }}
            >
              View Dashboard <span aria-hidden="true">→</span>
            </button>
            <button
              type="button"
              className="intro-start-btn secondary"
              onClick={() => {
                const confirmed = window.confirm('Are you sure? This will clear all stored data.');
                if (confirmed) {
                  // Clear localStorage and start fresh
                  localStorage.removeItem('t-money-toolbox-calculator-data');
                  window.location.reload();
                }
              }}
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              Start Fresh
            </button>
          </div>
        </section>
      )}

      {!hasStarted && showHousingChooser && (
        <section className="help-chooser-screen" aria-label="Housing setup">
          <h2 className="help-chooser-title">Do you rent or own?</h2>

          <div className="housing-choice-row" role="radiogroup" aria-label="Housing type">
            <label className="housing-radio-card" htmlFor="housing-rent">
              <input
                id="housing-rent"
                type="radio"
                name="housing-choice"
                value="rent"
                checked={housingInfo.occupancy === 'rent'}
                onChange={(event) => updateHousingInfo('occupancy', event.target.value)}
              />
              <span>Rent</span>
            </label>
            <label className="housing-radio-card" htmlFor="housing-own">
              <input
                id="housing-own"
                type="radio"
                name="housing-choice"
                value="own"
                checked={housingInfo.occupancy === 'own'}
                onChange={(event) => updateHousingInfo('occupancy', event.target.value)}
              />
              <span>Own</span>
            </label>
          </div>

          {housingInfo.occupancy === 'rent' && (
            <div className="housing-fields-wrap" aria-label="Rent details">
              <label htmlFor="housing-rent-amount">How much is your rent?</label>
              <input
                id="housing-rent-amount"
                type="text"
                inputMode="decimal"
                value={activeHousingField === 'rentAmount' ? housingInfo.rentAmount : formatCurrencyDisplay(housingInfo.rentAmount)}
                onFocus={() => setActiveHousingField('rentAmount')}
                onBlur={() => setActiveHousingField(null)}
                onChange={(event) => updateHousingInfo('rentAmount', event.target.value)}
                placeholder="Monthly rent"
              />
            </div>
          )}

          {housingInfo.occupancy === 'own' && (
            <div className="housing-fields-wrap" aria-label="Home ownership details">
              <label htmlFor="housing-mortgage-balance">Mortgage balance</label>
              <input
                id="housing-mortgage-balance"
                type="text"
                inputMode="decimal"
                value={activeHousingField === 'mortgageBalance' ? housingInfo.mortgageBalance : formatCurrencyDisplay(housingInfo.mortgageBalance)}
                onFocus={() => setActiveHousingField('mortgageBalance')}
                onBlur={() => setActiveHousingField(null)}
                onChange={(event) => updateHousingInfo('mortgageBalance', event.target.value)}
                placeholder="Remaining mortgage balance"
                disabled={housingInfo.homePaidOff}
              />

              <label htmlFor="housing-mortgage-rate">Mortgage interest rate (%)</label>
              <input
                id="housing-mortgage-rate"
                type="text"
                inputMode="decimal"
                value={activeHousingField === 'mortgageInterestRate' ? housingInfo.mortgageInterestRate : formatPercentDisplay(housingInfo.mortgageInterestRate)}
                onFocus={() => setActiveHousingField('mortgageInterestRate')}
                onBlur={() => setActiveHousingField(null)}
                onChange={(event) => updateHousingInfo('mortgageInterestRate', event.target.value)}
                placeholder="Interest rate"
                disabled={housingInfo.homePaidOff}
              />

              <label htmlFor="housing-mortgage-payment">Monthly mortgage payment</label>
              <input
                id="housing-mortgage-payment"
                type="text"
                inputMode="decimal"
                value={activeHousingField === 'monthlyMortgagePayment' ? housingInfo.monthlyMortgagePayment : formatCurrencyDisplay(housingInfo.monthlyMortgagePayment)}
                onFocus={() => setActiveHousingField('monthlyMortgagePayment')}
                onBlur={() => setActiveHousingField(null)}
                onChange={(event) => updateHousingInfo('monthlyMortgagePayment', event.target.value)}
                placeholder="Monthly payment"
                disabled={housingInfo.homePaidOff}
              />

              <label htmlFor="housing-home-equity">Home equity</label>
              <input
                id="housing-home-equity"
                type="text"
                inputMode="decimal"
                value={activeHousingField === 'homeEquity' ? housingInfo.homeEquity : formatCurrencyDisplay(housingInfo.homeEquity)}
                onFocus={() => setActiveHousingField('homeEquity')}
                onBlur={() => setActiveHousingField(null)}
                onChange={(event) => updateHousingInfo('homeEquity', event.target.value)}
                placeholder="Home equity"
                disabled={housingInfo.homePaidOff}
              />

              <label className="housing-paidoff-check" htmlFor="housing-paidoff">
                <input
                  id="housing-paidoff"
                  type="checkbox"
                  checked={Boolean(housingInfo.homePaidOff)}
                  onChange={(event) => handleHousingPaidOffToggle(event.target.checked)}
                />
                My home is paid off
              </label>
            </div>
          )}

          {canContinueHousing && (
            <div className="help-continue-wrap">
              <button
                type="button"
                className="help-continue-btn"
                onClick={handleHousingContinue}
              >
                Continue
              </button>
            </div>
          )}

          {!calculationResult && (
            <div className="help-continue-wrap">
              <button
                type="button"
                className="help-continue-btn secondary"
                onClick={() => setShowHousingChooser(false)}
              >
                Back
              </button>
            </div>
          )}
        </section>
      )}

      {!hasStarted && showCarLoansChooser && (
        <section className="help-chooser-screen" aria-label="Car loans setup">
          <h2 className="help-chooser-title">Do you have any car loans?</h2>

          <div className="housing-choice-row" role="radiogroup" aria-label="Car loans">
            <label className="housing-radio-card" htmlFor="car-loans-yes">
              <input
                id="car-loans-yes"
                type="radio"
                name="car-loans-choice"
                value="yes"
                checked={carLoansInfo.hasCarLoans === 'yes'}
                onChange={(event) => updateCarLoansInfo(event.target.value)}
              />
              <span>Yes</span>
            </label>
            <label className="housing-radio-card" htmlFor="car-loans-no">
              <input
                id="car-loans-no"
                type="radio"
                name="car-loans-choice"
                value="no"
                checked={carLoansInfo.hasCarLoans === 'no'}
                onChange={(event) => updateCarLoansInfo(event.target.value)}
              />
              <span>No</span>
            </label>
          </div>

          {carLoansInfo.hasCarLoans === 'yes' && (
            <div className="housing-fields-wrap">
              {carLoansInfo.loans.map((loan, index) => (
                <div key={loan.id} className="car-loan-item" style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    {editingCarLoanId === loan.id ? (
                      <input
                        type="text"
                        className="title-edit-input"
                        value={draftCarLoanName}
                        onChange={(event) => setDraftCarLoanName(event.target.value)}
                        onBlur={() => saveCarLoanName(loan.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            saveCarLoanName(loan.id);
                          }
                          if (event.key === 'Escape') {
                            cancelEditingCarLoanName();
                          }
                        }}
                        autoFocus
                        style={{ fontSize: '1rem', margin: 0, background: 'white', color: '#333', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="item-title-btn"
                        onClick={() => startEditingCarLoanName(loan)}
                        style={{ fontSize: '1rem', margin: 0, color: 'rgba(255,255,255,0.95)' }}
                      >
                        {loan.name || `Car Loan ${index + 1}`}
                      </button>
                    )}
                    {carLoansInfo.loans.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCarLoan(loan.id)}
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.2)', 
                          color: 'white', 
                          border: 'none', 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <label htmlFor={`car-loan-${loan.id}-balance`}>Remaining balance</label>
                  <input
                    id={`car-loan-${loan.id}-balance`}
                    type="text"
                    inputMode="decimal"
                    value={activeCarLoanField === `${loan.id}-balance` ? loan.balance : formatCurrencyDisplay(loan.balance)}
                    onFocus={() => setActiveCarLoanField(`${loan.id}-balance`)}
                    onBlur={() => setActiveCarLoanField(null)}
                    onChange={(event) => updateCarLoan(loan.id, 'balance', event.target.value)}
                    placeholder="Remaining balance"
                  />

                  <label htmlFor={`car-loan-${loan.id}-rate`}>Interest rate (%)</label>
                  <input
                    id={`car-loan-${loan.id}-rate`}
                    type="text"
                    inputMode="decimal"
                    value={activeCarLoanField === `${loan.id}-rate` ? loan.interestRate : formatPercentDisplay(loan.interestRate)}
                    onFocus={() => setActiveCarLoanField(`${loan.id}-rate`)}
                    onBlur={() => setActiveCarLoanField(null)}
                    onChange={(event) => updateCarLoan(loan.id, 'interestRate', event.target.value)}
                    placeholder="Interest rate"
                  />

                  <label htmlFor={`car-loan-${loan.id}-payment`}>Monthly payment</label>
                  <input
                    id={`car-loan-${loan.id}-payment`}
                    type="text"
                    inputMode="decimal"
                    value={activeCarLoanField === `${loan.id}-payment` ? loan.monthlyPayment : formatCurrencyDisplay(loan.monthlyPayment)}
                    onFocus={() => setActiveCarLoanField(`${loan.id}-payment`)}
                    onBlur={() => setActiveCarLoanField(null)}
                    onChange={(event) => updateCarLoan(loan.id, 'monthlyPayment', event.target.value)}
                    placeholder="Monthly payment"
                  />
                </div>
              ))}

              <button
                type="button"
                className="help-continue-btn secondary"
                onClick={addCarLoan}
                style={{ width: '100%', marginTop: '1rem' }}
              >
                + Add Another Car Loan
              </button>
            </div>
          )}

          {canContinueCarLoans && (
            <div className="help-continue-wrap">
              <button
                type="button"
                className="help-continue-btn"
                onClick={handleCarLoansContinue}
              >
                Continue
              </button>
            </div>
          )}

          <div className="help-continue-wrap">
            <button
              type="button"
              className="help-continue-btn secondary"
              onClick={() => {
                setShowCarLoansChooser(false);
                setShowHousingChooser(true);
              }}
            >
              Back
            </button>
          </div>
        </section>
      )}
    </>
  );
}

export default OnboardingScreens;
