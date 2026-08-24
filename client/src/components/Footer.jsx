import React from 'react';
import { APP_NAME } from '../utils/constants';

const Footer = () => {
  return (
    <footer className="footer">
      <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
    </footer>
  );
};

export default Footer;
