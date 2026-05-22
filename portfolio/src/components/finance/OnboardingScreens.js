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
  showHelpChooser,
  showHousingChooser,
  setShowHelpChooser,
  setShowHousingChooser,
  selectedHelpOptions,
  helpOptions,
  allOptionLabel,
  handleHelpOptionToggle,
  handleHelpChooserContinue,
  housingInfo,
  updateHousingInfo,
  handleHousingPaidOffToggle,
  canContinueHousing,
  handleHousingContinue
}) {
  const isAllOptionSelected = selectedHelpOptions.includes(allOptionLabel);
  const [activeHousingField, setActiveHousingField] = useState(null);
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

  return (
    <>
      {hasStarted && (
        <div className="tmoney-brand-container">
          <button
            type="button"
            className="tmoney-brand"
            aria-label="T-Money $$$ Toolbox"
            onClick={() => {
              setHasStarted(false);
              setShowHelpChooser(false);
              setShowHousingChooser(false);
            }}
          >
            <span className="tmoney-brand-emoji" aria-hidden="true">💸</span>
            <span className="tmoney-brand-text">T-Money $$$ Toolbox</span>
          </button>
          {showSpeechBubble && (
            <div className="tmoney-speech-bubble">
              <div className="speech-bubble-content">
                <strong>T-Money says:</strong> {currentSaying}
              </div>
            </div>
          )}
        </div>
      )}

      {!hasStarted && !showHelpChooser && !showHousingChooser && (
        <section className="intro-screen" aria-label="Introduction">
          <h1 className="intro-title">Hey!</h1>
          <p className="intro-copy">Welcome to the T-Money $$$ Toolbox, follow the prompts and take the next step in your financial journey today.</p>
          <button
            type="button"
            className="intro-start-btn"
            onClick={() => setShowHelpChooser(true)}
          >
            Start <span aria-hidden="true">→</span>
          </button>
        </section>
      )}

      {!hasStarted && showHelpChooser && !showHousingChooser && (
        <section className="help-chooser-screen" aria-label="What do you want options">
          <h2 className="help-chooser-title">What do you want?</h2>
          <div className="help-options-grid">
            {helpOptions.map((option) => {
              const isSelected = selectedHelpOptions.includes(option);
              const isDisabled = isAllOptionSelected && option !== allOptionLabel;

              return (
                <button
                  key={option}
                  type="button"
                  className={`help-option-btn ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => handleHelpOptionToggle(option)}
                  disabled={isDisabled}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <div className="help-continue-wrap">
            <button
              type="button"
              className="help-continue-btn"
              onClick={handleHelpChooserContinue}
              disabled={selectedHelpOptions.length === 0}
            >
              Continue
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

          <div className="help-continue-wrap">
            <button
              type="button"
              className="help-continue-btn secondary"
              onClick={() => {
                setShowHousingChooser(false);
                setShowHelpChooser(true);
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
