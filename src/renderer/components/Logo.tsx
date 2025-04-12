import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="28" height="28" rx="3" fill="#1E3A8A"/>
      <path d="M7 9H21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 14H21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 19H21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M11 7L11 21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M17 7L17 21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
};

export default Logo;
