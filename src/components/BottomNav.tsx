import React from 'react';
import { Check, Zap, MessageCircle, User } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'timer', icon: Check },
    { id: 'feed', icon: Zap },
    { id: 'community', icon: MessageCircle },
    { id: 'profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-dark-border px-6 py-4 pb-8 z-50">
      <div className="max-w-md mx-auto flex justify-between items-center bg-dark-surface rounded-full px-2 py-1 relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex items-center justify-center w-12 h-12 rounded-full transition-colors overflow-hidden"
              style={{ flex: 1 }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white/10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon
                className={`w-6 h-6 transition-colors z-10 ${
                  isActive ? 'text-brand-cyan' : 'text-gray-500'
                }`}
              />
              {isActive && (
                <motion.div
                  layoutId="activeDot"
                  className="absolute bottom-1.5 w-1 h-1 bg-brand-cyan rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
