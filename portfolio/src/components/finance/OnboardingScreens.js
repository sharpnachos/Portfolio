import React from 'react';

function OnboardingScreens({
  hasStarted,
  showHelpChooser,
  setShowHelpChooser,
  selectedHelpOptions,
  helpOptions,
  allOptionLabel,
  handleHelpOptionToggle,
  handleHelpChooserContinue
}) {
  const isAllOptionSelected = selectedHelpOptions.includes(allOptionLabel);

  return (
    <>
      {hasStarted && (
        <button type="button" className="tmoney-brand" aria-label="T-Money Toolbox">
          <span className="tmoney-brand-emoji" aria-hidden="true">💸</span>
          <span className="tmoney-brand-text">T-Money Toolbox</span>
        </button>
      )}

      {!hasStarted && !showHelpChooser && (
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

      {!hasStarted && showHelpChooser && (
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
    </>
  );
}

export default OnboardingScreens;
