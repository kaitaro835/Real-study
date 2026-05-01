/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { AuthView } from './components/AuthView';
import { BottomNav } from './components/BottomNav';
import { TimerView } from './components/TimerView';
import { FeedView } from './components/FeedView';
import { CommunityView } from './components/CommunityView';
import { ProfileView } from './components/ProfileView';
import { motion, AnimatePresence } from 'motion/react';
import { Clock } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timer');

  // persistent timer state
  const [isActive, setIsActive] = useState(() => {
    return localStorage.getItem('timer_active') === 'true';
  });
  const [seconds, setSeconds] = useState(0);
  const [activity, setActivity] = useState(() => {
    return localStorage.getItem('timer_activity') || 'Study';
  });
  const [startTime, setStartTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('timer_start_time');
    return saved ? parseInt(saved, 10) : null;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Focus Miner',
            photoURL: currentUser.photoURL,
            bio: null,
            streak: 0,
            totalMinutes: 0,
            followersCount: 0,
            followingCount: 0,
            createdAt: serverTimestamp(),
          });
        }
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Timer Persistence Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && startTime) {
      // Calculate initial offset
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setSeconds(elapsed);

      interval = setInterval(() => {
        setSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      localStorage.setItem('timer_active', 'true');
      localStorage.setItem('timer_activity', activity);
      localStorage.setItem('timer_start_time', startTime.toString());
      
      // Update browser title
      document.title = `Mining ${activity}...`;
    } else if (!isActive) {
      localStorage.removeItem('timer_active');
      localStorage.removeItem('timer_start_time');
      document.title = "Focus Miner";
    }

    return () => clearInterval(interval);
  }, [isActive, startTime, activity]);

  const handleStartTimer = (act: string) => {
    const now = Date.now();
    setStartTime(now);
    setActivity(act);
    setIsActive(true);
  };

  const handleStopTimer = () => {
    setIsActive(false);
    setStartTime(null);
  };

  const handleResetTimer = () => {
    setIsActive(false);
    setStartTime(null);
    setSeconds(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 border-4 border-brand-cyan border-t-transparent rounded-xl"
        />
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'timer': 
        return (
          <TimerView 
            onComplete={() => setActiveTab('feed')} 
            isActive={isActive}
            seconds={seconds}
            activity={activity}
            setActivity={setActivity}
            onStart={handleStartTimer}
            onStop={handleStopTimer}
            onReset={handleResetTimer}
          />
        );
      case 'feed': return <FeedView />;
      case 'community': return <CommunityView />;
      case 'profile': return <ProfileView />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand-cyan selection:text-black">
      {/* Global Persistence Bar */}
      <AnimatePresence>
        {isActive && activeTab !== 'timer' && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            onClick={() => setActiveTab('timer')}
            className="fixed top-0 left-0 right-0 z-50 bg-brand-cyan text-black px-4 py-2 flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">{activity}</span>
            </div>
            <span className="font-mono font-bold">{formatTime(seconds)}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={`max-w-7xl mx-auto transition-all duration-300 ${isActive && activeTab !== 'timer' ? 'pt-12' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
