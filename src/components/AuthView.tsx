import React from 'react';
import { LogIn } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { motion } from 'motion/react';

export const AuthView: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-8"
      >
        <div className="relative inline-block">
          <div className="absolute -inset-4 bg-brand-lime/20 blur-3xl rounded-full" />
          <h1 className="text-6xl font-display italic text-brand-lime relative">
            Stack
          </h1>
        </div>
        
        <div className="space-y-4 max-w-xs mx-auto">
          <p className="text-gray-400 text-lg">
            Study together, stay motivated. Real-time focus sharing.
          </p>
          
          <button
            onClick={() => signInWithGoogle()}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 px-6 rounded-2xl hover:bg-gray-100 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>
      </motion.div>
    </div>
  );
};
