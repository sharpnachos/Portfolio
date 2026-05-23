import React, { useState, useEffect } from 'react';

function TypingAnimation({ text, speed = 100 }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i === text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return <h1>{displayed}</h1>;
}

export default TypingAnimation;