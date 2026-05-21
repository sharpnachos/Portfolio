import React from 'react';

function AboutMeColumn({
  aboutMe,
  updateAboutMeField,
  activeAmountField,
  setActiveAmountField,
  formatCurrencyDisplay,
  sanitizeDecimalInput
}) {
  return (
    <section className="finance-column rounded-2xl border border-emerald-100/80 bg-white/90 shadow-glow backdrop-blur-sm" aria-label="About Me column">
      <h2>About Me</h2>
      <div className="field-list">
        <div className="field-row">
          <span className="item-title-static">Age?</span>
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
          <span className="item-title-static">Single or Married?</span>
          <div className="field-controls">
            <select
              id="about-me-marital-status"
              className="frequency-select"
              value={aboutMe.maritalStatus}
              onChange={(event) => updateAboutMeField('maritalStatus', event.target.value)}
            >
              <option value="single">Single</option>
              <option value="married">Married</option>
            </select>
          </div>
        </div>

        <div className="field-row">
          <span className="item-title-static">What is your lowest deductible?</span>
          <div className="field-controls">
            <input
              id="about-me-lowest-deductible"
              type="text"
              inputMode="decimal"
              pattern="^[0-9]*[.,]?[0-9]*$"
              value={activeAmountField === 'about-me-lowest-deductible' ? aboutMe.lowestDeductible : formatCurrencyDisplay(aboutMe.lowestDeductible)}
              placeholder="Enter lowest deductible"
              onFocus={() => setActiveAmountField('about-me-lowest-deductible')}
              onBlur={() => {
                setActiveAmountField(null);
                if (aboutMe.lowestDeductible !== '' && !isNaN(Number(aboutMe.lowestDeductible))) {
                  updateAboutMeField('lowestDeductible', Number(aboutMe.lowestDeductible).toFixed(2));
                }
              }}
              onChange={(event) => {
                // Allow only numbers and decimals
                let val = event.target.value.replace(/[^0-9.]/g, '');
                // Only one decimal point
                val = val.replace(/(\..*)\./g, '$1');
                updateAboutMeField('lowestDeductible', val);
              }}
            />
          </div>
        </div>

        <div className="field-row">
          <span className="item-title-static">Do you have a High deductible Health insurance plan?</span>
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
      </div>
    </section>
  );
}

export default AboutMeColumn;
