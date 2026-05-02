import React, { useState, useEffect } from 'react';
import { Settings, Edit3, Award, Zap, Clock, Users, ArrowLeft, UserPlus, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit, updateDoc, setDoc, deleteDoc, increment, serverTimestamp } from 'firebase/firestore';
import { UserProfile, Stack, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';

interface ProfileViewProps {
  targetUserId?: string | null;
  onBack?: () => void;
  onStartDM?: (userId: string, userName: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ targetUserId, onBack, onStartDM }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userStacks, setUserStacks] = useState<Stack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);

  const currentUser = auth.currentUser;
  const effectiveUserId = targetUserId || currentUser?.uid;
  const isOwnProfile = effectiveUserId === currentUser?.uid;

  useEffect(() => {
    if (!effectiveUserId) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'users', effectiveUserId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
          setEditName(data.displayName || '');
          setEditBio(data.bio || '');
        }

        // Check if following
        if (currentUser && !isOwnProfile) {
          const followRef = doc(db, 'follows', `${currentUser.uid}_${effectiveUserId}`);
          const followSnap = await getDoc(followRef);
          setIsFollowing(followSnap.exists());
        }

        const q = query(
          collection(db, 'stacks'),
          where('userId', '==', effectiveUserId),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        const stacks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Stack[];
        setUserStacks(stacks);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${effectiveUserId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [effectiveUserId]);

  if (!currentUser) return null;

  const handleSave = async () => {
    if (!currentUser || !editName.trim()) return;
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      await updateDoc(docRef, {
        displayName: editName,
        bio: editBio,
      });
      setProfile(prev => prev ? { ...prev, displayName: editName, bio: editBio } : null);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !effectiveUserId || isOwnProfile) return;
    
    const followId = `${currentUser.uid}_${effectiveUserId}`;
    const followRef = doc(db, 'follows', followId);
    const targetUserRef = doc(db, 'users', effectiveUserId);
    const currentUserRef = doc(db, 'users', currentUser.uid);

    try {
      if (isFollowing) {
        // Unfollow
        setIsFollowing(false);
        setProfile(prev => prev ? { ...prev, followersCount: Math.max(0, (prev.followersCount || 0) - 1) } : null);
        
        await deleteDoc(followRef);
        await updateDoc(targetUserRef, { followersCount: increment(-1) });
        await updateDoc(currentUserRef, { followingCount: increment(-1) });
      } else {
        // Follow
        setIsFollowing(true);
        setProfile(prev => prev ? { ...prev, followersCount: (prev.followersCount || 0) + 1 } : null);

        await setDoc(followRef, {
          followerId: currentUser.uid,
          followingId: effectiveUserId,
          createdAt: serverTimestamp()
        });
        await updateDoc(targetUserRef, { followersCount: increment(1) });
        await updateDoc(currentUserRef, { followingCount: increment(1) });
      }
    } catch (error) {
      console.error('Follow error:', error);
      // Revert local state on error
      setIsFollowing(!isFollowing);
      handleFirestoreError(error, OperationType.UPDATE, `follows/${followId}`);
    }
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-32">
      <div className="flex justify-between p-2">
        {onBack ? (
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-dark-surface rounded-full flex items-center justify-center border border-dark-border text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : <div />}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center space-y-6 mt-4"
      >
        <div className="relative">
          <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-brand-cyan p-1">
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${effectiveUserId}`} 
              alt={profile?.displayName || 'User'} 
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        </div>

        <div className="text-center space-y-1 w-full flex flex-col items-center">
          {isEditing && isOwnProfile ? (
            <div className="space-y-4 w-full px-8">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Name"
                className="w-full bg-dark-surface border border-white/10 rounded-xl px-4 py-3 text-center font-bold outline-none focus:border-brand-cyan transition-colors"
              />
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Talk about yourself..."
                className="w-full bg-dark-surface border border-white/10 rounded-xl px-4 py-3 text-center text-sm outline-none focus:border-brand-cyan transition-colors min-h-[80px]"
              />
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold">{profile?.displayName || 'Miner'}</h2>
              <p className="text-gray-500 text-sm max-w-[280px]">
                {profile?.bio || 'Building a better future, one stack at a time.'}
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 w-full bg-dark-surface rounded-3xl p-6 border border-white/5 divide-x divide-white/10">
          <div className="flex flex-col items-center justify-center px-2">
            <span className="text-xl font-bold text-brand-cyan leading-tight">{profile?.streak || 1}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Streak</span>
          </div>
          <div className="flex flex-col items-center justify-center px-2">
            <span className="text-xl font-bold text-brand-cyan leading-tight">
              {Math.floor((profile?.totalMinutes || 0) / 60)}h{(profile?.totalMinutes || 0) % 60}m
            </span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Total</span>
          </div>
          <div className="flex flex-col items-center justify-center px-2">
            <span className="text-xl font-bold leading-tight">{profile?.followersCount || 0}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Followers</span>
          </div>
        </div>

        <div className="flex gap-3 w-full">
          {isOwnProfile ? (
            isEditing ? (
              <>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-dark-surface border border-dark-border text-white font-bold py-3 rounded-2xl text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={!editName.trim()}
                  className="flex-1 bg-brand-cyan text-black font-bold py-3 rounded-2xl text-sm disabled:opacity-50"
                >
                  Save Profile
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex-1 bg-white text-black font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </button>
                <button className="bg-dark-surface border border-dark-border px-5 py-3 rounded-2xl flex items-center justify-center text-gray-400">
                  <Award className="w-5 h-5 text-brand-cyan" />
                </button>
              </>
            )
          ) : (
            <>
              <button 
                onClick={handleFollow}
                className={`flex-1 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all ${
                  isFollowing 
                    ? 'bg-dark-surface border border-brand-cyan/30 text-brand-cyan' 
                    : 'bg-brand-cyan text-black hover:bg-brand-cyan/90'
                }`}
              >
                {isFollowing ? 'Following' : <> <UserPlus className="w-4 h-4" /> Follow </>}
              </button>
              <button 
                onClick={() => onStartDM?.(effectiveUserId, profile?.displayName || 'User')}
                className="bg-dark-surface border border-dark-border px-6 py-4 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                title="Message"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </motion.div>

      <div className="mt-12 space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-bold text-lg">{isOwnProfile ? 'My Stacks' : 'Focus History'}</h3>
          <span className="text-xs text-gray-500 uppercase tracking-widest">History</span>
        </div>

        <div className="space-y-3">
          {userStacks.map((stack) => (
            <motion.div
              key={stack.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-dark-surface/50 rounded-2xl p-4 border border-white/5 flex items-center justify-between group hover:border-brand-cyan/30 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center text-brand-cyan">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{stack.activity}</h4>
                  <p className="text-[10px] text-gray-500 font-mono">+{stack.durationMinutes} minutes • {stack.createdAt?.toDate().toLocaleDateString()}</p>
                </div>
              </div>
            </motion.div>
          ))}
          
          {!loading && userStacks.length === 0 && (
            <div className="text-center py-12 text-gray-600 text-sm">
              {isOwnProfile ? 'Your focus history is empty.' : 'No history shared yet.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
