import React from 'react';
import { APP_NAME } from '../utils/constants';

const Navbar = () => {
  return (
    <header className="navbar">
      <div className="logo">{APP_NAME}</div>
      <nav className="nav-links">
        <a href="#home">Home</a>
        <a href="#about">About</a>
        <a href="#api">API Status</a>
      </nav>
    </header>
  );
};

export default Navbar;
