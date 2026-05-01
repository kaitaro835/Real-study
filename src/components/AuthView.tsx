import React from 'react';
import { LogIn, User } from 'lucide-react';
import { signInWithGoogle, signInAsGuest } from '../lib/firebase';
import { motion } from 'motion/react';

export const AuthView: React.FC = () => {
  const [loading, setLoading] = React.useState(false);

  const handleSignIn = async () => {
    console.log('Sign-in button clicked');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Sign-in error:', error);
      alert(`Sign-in failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setLoading(true);
    try {
      await signInAsGuest();
    } catch (error: any) {
      console.error('Guest sign-in error:', error);
      alert(`Guest sign-in failed: ${error.message || 'Unknown error'}. Make sure Anonymous Auth is enabled in Firebase Console.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-white">
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
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 px-6 rounded-2xl hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </button>

          <button
            onClick={handleGuestSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-gray-500 font-bold py-2 px-6 hover:text-gray-300 transition-colors text-sm disabled:opacity-50"
          >
            <User className="w-4 h-4" />
            Continue as Guest
          </button>
        </div>

        <div className="pt-8 text-left max-w-xs mx-auto">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2">Troubleshooting</p>
          <p className="text-[10px] text-gray-500 leading-relaxed italic">
            If Google sign-in won't open, add this domain to "Authorized domains" in Firebase Console:
          </p>
          <code className="block mt-1 p-2 bg-white/5 rounded text-[10px] text-brand-lime/70 break-all">
            {window.location.hostname}
          </code>
        </div>
      </motion.div>
    </div>
  );
};
