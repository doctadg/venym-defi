
export const StarIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 12 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 0.5L7.6 4.2L11.5 4.5L8.5 7.1L9.5 11L6 8.8L2.5 11L3.5 7.1L0.5 4.5L4.4 4.2L6 0.5Z" />
  </svg>
);

export const ChevronDown = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 4.5L6 8L9.5 4.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EyeIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 6C1 6 2.5 2 6 2C9.5 2 11 6 11 6C11 6 9.5 10 6 10C2.5 10 1 6 1 6Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="6" r="1.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const InfoIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <circle cx="6" cy="6" r="4.5" strokeWidth="1.2" />
    <path d="M6 6V8.5" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="6" cy="3.5" r="0.5" fill="currentColor" />
  </svg>
);

export const BitcoinLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="15" fill="#F7931A" />
    <path d="M21.75 12.75C21.5 10.75 19.5 10.5 19.5 10.5V8H18V10.25H16.5V8H15V10.25H12.5V11.75H13.75C13.75 11.75 14.25 11.75 14.25 12.25V19.75C14.25 19.75 13.75 20.25 13.75 20.25H12.5V21.75H15V24H16.5V21.75H18V24H19.5V21.75C19.5 21.75 22.5 21.25 22.25 18.25C22 16 20.5 15.5 20.5 15.5C20.5 15.5 22 14.75 21.75 12.75ZM18.25 19.25H16.5V16.75H18.25C18.25 16.75 19.25 16.75 19.25 18C19.25 19.25 18.25 19.25 18.25 19.25ZM18 15.25H16.5V13H18C18 13 19 13 19 14.25C19 15.25 18 15.25 18 15.25Z" fill="white" />
  </svg>
);

export const SourceIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="3" height="4" rx="0.5" fill="#56C0A6" fillOpacity="0.8" />
    <rect x="7" y="4" width="3" height="4" rx="0.5" fill="#56C0A6" fillOpacity="0.8" />
  </svg>
);

export const SortIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 4L6 1L9 4" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 8L6 11L9 8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EditIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 10H3.5L8.5 5L7 3.5L2 8.5V10Z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CopyIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChartLineUpIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3V21H21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 9L14 14L10 10L7 13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CloseIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 6L18 18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SearchIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TelegramIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.638.018h.638zm.609 16.905c-2.61.168-4.757.294-8.083.435.59-3.235 1.76-6.726 1.76-6.726.04-.15.06-.33.02-.45a.39.39 0 0 0-.32-.23c-.34-.04-1.22-.11-1.22-.11s-.4-.05-.51-.01c-.11.04-.21.19-.21.19s-1.87 3.55-2.65 5.5c-.17.43.03.62.03.62s.14.07.24.08c1.32.17 2.65.34 3.98.51 0 0 .19.03.26.23.08.2.06.49.06.49s.02.66-.08.85c-.1.19-.27.24-.27.24s-.36.09-1.29.35c.78.33 2.11.89 2.11.89s.38.16.59.08c.21-.08.29-.39.29-.39s.43-1.27.65-1.92c.16-.48.65-.62.65-.62s.37-.08.57.17c.2.25.13.79.13.79s-.35 2.37-.58 3.52c-.06.31.13.41.13.41s.41.11.85-.35c1.78-1.87 3.56-4.04 4.88-5.87.14-.19.04-.32.04-.32s-.11-.13-.34-.02c-1.39.69-3.15 1.57-4.14 2.05-.18.09-.37.06-.37.06s-.19-.05-.16-.32c.03-.27.35-2.28.61-3.66.04-.22-.11-.3-.11-.3s-.18-.08-.43.02c-1.8.72-4.16 1.76-5.83 2.56-.23.11-.27.29-.27.29s-.03.18.2.28c.95.42 2.19.98 2.19.98s.26.12.44-.04c.18-.16 1.15-1.07 1.15-1.07s.11-.11.18-.03c.07.08.01.19.01.19s-.82.78-1.12 1.05z" />
  </svg>
);

export const CheckIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const WalletIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 4H3C1.89543 4 1 4.89543 1 6V18C1 19.1046 1.89543 20 3 20H21C22.1046 20 23 19.1046 23 18V6C23 4.89543 22.1046 4 21 4Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1 10H23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="18" cy="15" r="1" fill="currentColor" />
  </svg>
);

export const UnlockIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.419 2 16.4367 3.71776 16.9 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AlertTriangleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.29 3.86L1.82 18C1.64 18.3 1.55 18.64 1.55 19C1.55 19.36 1.64 19.7 1.82 20C2 20.3 2.26 20.56 2.57 20.74C2.88 20.92 3.24 21.01 3.6 21H20.4C20.76 21.01 21.12 20.92 21.43 20.74C21.74 20.56 22 20.3 22.18 20C22.36 19.7 22.45 19.36 22.45 19C22.45 18.64 22.36 18.3 22.18 18L13.71 3.86C13.53 3.56 13.27 3.32 12.96 3.15C12.65 2.98 12.3 2.89 11.94 2.89C11.58 2.89 11.23 2.98 10.92 3.15C10.61 3.32 10.35 3.56 10.17 3.86H10.29Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 9V13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 17H12.01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const XMarkIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 6L18 18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);