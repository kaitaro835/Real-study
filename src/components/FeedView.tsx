import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment, limit } from 'firebase/firestore';
import { Stack, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

export const FeedView: React.FC = () => {
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'stacks'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Stack[];
        setStacks(items);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'stacks');
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLike = async (stackId: string) => {
    const docRef = doc(db, 'stacks', stackId);
    try {
      await updateDoc(docRef, {
        likesCount: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stacks/${stackId}`);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 pb-32 pt-2">
      <div className="flex items-center justify-between mb-6 px-2">
        <h1 className="text-2xl font-bold tracking-tight">Stack Feed</h1>
        <div className="relative">
          <div className="w-10 h-10 bg-dark-surface rounded-full flex items-center justify-center border border-dark-border text-gray-400">
            <span className="relative flex h-3 w-3 -mr-5 -mt-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-cyan"></span>
            </span>
            <MoreHorizontal className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {stacks.map((stack) => (
            <motion.div
              key={stack.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-dark-surface rounded-3xl overflow-hidden border border-white/5"
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/10">
                    {stack.userPhotoURL ? (
                      <img src={stack.userPhotoURL} alt={stack.userName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold">
                        {stack.userName[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{stack.userName}</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                      {stack.activity} • +{stack.durationMinutes}min
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500">
                  {stack.createdAt ? formatDistanceToNow(stack.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                </span>
              </div>

              {stack.photoURL && (
                <div className="px-4">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-black/40">
                    <img src={stack.photoURL} alt="Progress" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              {stack.note && (
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {stack.note}
                  </p>
                </div>
              )}

              <div className="px-4 py-3 flex items-center gap-6 border-t border-white/5">
                <button
                  onClick={() => handleLike(stack.id)}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-brand-cyan transition-colors group"
                >
                  <Heart className={`w-5 h-5 ${stack.likesCount > 0 ? 'fill-brand-cyan text-brand-cyan' : 'group-hover:fill-current'}`} />
                  <span className="text-xs font-medium">{stack.likesCount}</span>
                </button>
                <button className="flex items-center gap-1.5 text-gray-400 hover:text-brand-cyan transition-colors group">
                  <MessageCircle className="w-5 h-5 group-hover:fill-current" />
                  <span className="text-xs font-medium">{stack.commentsCount}</span>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-500 animate-pulse uppercase tracking-widest">Updating signals...</p>
          </div>
        )}

        {!loading && stacks.length === 0 && (
          <div className="text-center p-12 bg-dark-surface rounded-[40px] border border-dashed border-dark-border">
            <p className="text-gray-500">No signals found yet.</p>
            <p className="text-xs text-gray-600 mt-2">Be the first to stack!</p>
          </div>
        )}
      </div>
    </div>
  );
};
