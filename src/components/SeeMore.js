import React from 'react';
import Button from 'react-bootstrap/Button';
import { useNavigate } from 'react-router-dom';

function SeeMore({ label = "More...", to }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    }
  };

  return (
    <Button
      className="see-more-btn"
      variant="outline-primary"
      size="lg"
      onClick={to ? handleClick : undefined}
    >
      {label} <span style={{ fontSize: '1.3em', lineHeight: 1 }}></span>
    </Button>
  );
}

export default SeeMore;