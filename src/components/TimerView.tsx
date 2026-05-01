import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Camera, Send, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc, increment } from 'firebase/firestore';
import { OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';

interface TimerViewProps {
  onComplete?: () => void;
  isActive: boolean;
  seconds: number;
  activity: string;
  setActivity: (activity: string) => void;
  onStart: (activity: string) => void;
  onStop: () => void;
  onReset: () => void;
}

export const TimerView: React.FC<TimerViewProps> = ({ 
  onComplete, 
  isActive, 
  seconds, 
  activity, 
  setActivity,
  onStart,
  onStop,
  onReset
}) => {
  const [activities, setActivities] = useState<string[]>(() => {
    const saved = localStorage.getItem('focus_activities');
    return saved ? JSON.parse(saved) : ['Study', 'Coding', 'Reading', 'Design', 'Gaming', 'Gym'];
  });
  const [showSummary, setShowSummary] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Your browser does not support camera access. Using file picker instead.");
      fileInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      setIsCameraOpen(true);
      // Wait for state update then attach stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera error:", err);
      // Fallback to file input
      fileInputRef.current?.click();
      
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        alert("Camera permission was denied. Please enable it in your browser settings or use the file picker.");
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setPhoto(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const stopTimer = () => {
    onStop();
    setShowSummary(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const shareStack = async () => {
    if (!auth.currentUser) return;
    
    // Calculate minutes, ensuring at least 1 minute for any non-zero session in this demo
    const durationMinutes = seconds > 0 ? Math.max(1, Math.floor(seconds / 60)) : 0;
    const path = 'stacks';
    
    try {
      await addDoc(collection(db, path), {
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'User',
        userPhotoURL: auth.currentUser.photoURL,
        activity,
        durationMinutes,
        startTime: new Date(Date.now() - seconds * 1000),
        endTime: new Date(),
        photoURL: photo,
        note,
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
      });
      
      // Update user stats
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        totalMinutes: increment(durationMinutes),
        streak: increment(1),
      }, { merge: true });

      // Reset states
      onReset();
      setPhoto(null);
      setNote('');
      setShowSummary(false);
      
      // Navigate to feed
      if (onComplete) onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 pb-32">
      <AnimatePresence mode="wait">
        {!showSummary ? (
          <motion.div
            key="timer"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-md bg-dark-surface rounded-[40px] p-8 space-y-12 text-center"
          >
            <div className="space-y-4">
              <input
                type="text"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                className="bg-transparent text-center text-3xl font-bold text-gray-400 focus:text-white outline-none w-full"
                placeholder="What are you doing?"
              />
              
              {!isActive && (
                <div className="flex flex-wrap justify-center gap-2 mt-2 px-4">
                  {activities.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setActivity(preset)}
                      className={`text-[10px] px-3 py-1 rounded-full border transition-all uppercase tracking-widest font-bold ${
                        activity === preset 
                        ? 'bg-brand-cyan text-black border-brand-cyan' 
                        : 'bg-white/5 text-gray-500 border-white/10 hover:border-white/30'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  {!activities.includes(activity) && activity.trim() !== '' && (
                    <button
                      onClick={() => {
                        const updated = [...activities, activity.trim()];
                        setActivities(updated);
                        localStorage.setItem('focus_activities', JSON.stringify(updated));
                      }}
                      className="text-[10px] px-3 py-1 rounded-full border border-brand-cyan/50 text-brand-cyan hover:bg-brand-cyan/10 transition-all uppercase tracking-widest font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Save "{activity}"
                    </button>
                  )}
                </div>
              )}
              
              <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">
                Focus Mode
              </p>
            </div>

            <div className="relative aspect-square flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform">
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-800"
                />
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="1 1"
                  pathLength="1"
                  className="text-brand-cyan"
                  animate={{ pathLength: (seconds % 3600) / 3600 || (seconds > 0 && (seconds % 3600 === 0) ? 1 : 0) }}
                  transition={{ duration: 0.5, ease: "linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-7xl font-mono tracking-tighter">
                  {formatTime(seconds)}
                </span>
              </div>
            </div>

            <div className="flex justify-center gap-6">
              {!isActive ? (
                <button
                  onClick={() => onStart(activity)}
                  className="w-20 h-20 bg-brand-cyan text-black rounded-3xl flex items-center justify-center shadow-lg shadow-brand-cyan/20"
                >
                  <Play className="w-8 h-8 fill-current" />
                </button>
              ) : (
                <button
                  onClick={stopTimer}
                  className="w-20 h-20 bg-red-500 text-white rounded-3xl flex items-center justify-center"
                >
                  <Square className="w-8 h-8 fill-current" />
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="w-full max-w-md bg-dark-surface rounded-[40px] p-8 space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Session Summary</h2>
              <button onClick={() => setShowSummary(false)} className="text-gray-500">
                <X />
              </button>
            </div>

            <div className="bg-black/50 rounded-2xl p-6 text-center space-y-2">
              <span className="text-gray-500 text-sm">{activity}</span>
              <p className="text-5xl font-mono font-bold text-brand-cyan">
                {formatTime(seconds)}
              </p>
            </div>

            <div className="space-y-4">
              <div
                onClick={startCamera}
                className="aspect-video bg-black rounded-3xl border-2 border-dashed border-dark-border flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
              >
                {photo ? (
                  <img src={photo} alt="Session" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-500 group-hover:text-brand-cyan transition-colors" />
                    <p className="text-gray-500 text-sm mt-2">Add a photo</p>
                  </>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  className="hidden"
                  accept="image/*"
                  capture="environment"
                />
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What did you achieve?"
                className="w-full bg-black/50 border border-dark-border rounded-2xl p-4 min-h-[100px] outline-none focus:border-brand-cyan transition-colors text-sm"
              />
            </div>

            <button
              onClick={shareStack}
              disabled={seconds < 10} // Prevent tiny sessions
              className="w-full bg-brand-cyan text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              Stack to Feed
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="flex-1 relative flex items-center justify-center p-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-[40px]"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <button 
                onClick={stopCamera}
                className="absolute top-8 right-8 w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-12 pb-20 flex justify-center items-center gap-12 bg-black">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 flex items-center justify-center text-gray-400"
              >
                <Square className="w-6 h-6 border-2 border-current rounded-md" />
              </button>
              
              <button
                onClick={capturePhoto}
                className="w-20 h-20 bg-white rounded-full p-1 border-4 border-white/20"
              >
                <div className="w-full h-full bg-white rounded-full border-2 border-black" />
              </button>
              
              <div className="w-12 h-12" /> { /* spacer */ }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
