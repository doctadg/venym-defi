import React from 'react';

interface ChainAvatarProps {
  chain: {
    logoUrl?: string;
    name: string;
  };
  size?: string;
}

const ChainAvatar: React.FC<ChainAvatarProps> = ({ chain, size = "w-6 h-6" }) => {
  if (!chain.logoUrl) {
    return (
      <div className={`${size} rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm`}>
        {chain.name.slice(0, 1)}
      </div>
    );
  }

  return (
    <img 
      src={chain.logoUrl} 
      alt={chain.name}
      className={`${size} rounded-full object-cover border-2 border-white shadow-sm`}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none'; // Hide image on error
        // Fallback to text avatar if image fails to load
        const parent = e.currentTarget.parentElement;
        if (parent) {
          parent.innerHTML = `
            <div class="${size} rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm">
              ${chain.name.slice(0, 1)}
            </div>
          `;
        }
      }}
    />
  );
};

export default ChainAvatar;
