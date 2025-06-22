import React, { useState } from 'react';
import '../App.css';
import { useNavigate } from 'react-router-dom';

function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleToggle = () => setOpen(!open);
  const handleClose = () => setOpen(false);

  const handleLogoClick = () => {
    navigate('/');
    setOpen(false);
  };

  return (
    <nav className="App-navbar">
      <div className="navbar-content">
        <span
          className="navbar-logo"
          style={{ cursor: 'pointer' }}
          onClick={handleLogoClick}
        >
          Thomas
        </span>
        <button
          className={`hamburger${open ? ' open' : ''}`}
          onClick={handleToggle}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
      </div>
      {open && (
        <div className="dropdown">
          <a href="#about" onClick={handleClose}>About</a>
          <a href="#work" onClick={handleClose}>Work</a>
          <a href="#contact" onClick={handleClose}>Contact</a>
        </div>
      )}
    </nav>
  );
}

export default Navbar;