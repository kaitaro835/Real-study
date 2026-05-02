import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MoreHorizontal, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  limit,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { Message, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';

interface DirectMessageViewProps {
  targetUserId: string;
  targetUserName: string;
  onBack: () => void;
}

export const DirectMessageView: React.FC<DirectMessageViewProps> = ({ targetUserId, targetUserName, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentUser = auth.currentUser;

  // Generate a consistent conversation ID for two users
  const conversationId = [currentUser?.uid, targetUserId].sort().join('_');

  useEffect(() => {
    if (!currentUser) return;

    // Ensure conversation doc exists
    const ensureConversation = async () => {
      const convRef = doc(db, 'conversations', conversationId);
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) {
        await setDoc(convRef, {
          participants: [currentUser.uid, targetUserId],
          updatedAt: serverTimestamp(),
          lastMessage: ''
        });
      }
    };
    ensureConversation();

    const q = query(
      collection(db, `conversations/${conversationId}/messages`),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `conversations/${conversationId}/messages`);
    });

    return () => unsubscribe();
  }, [conversationId, currentUser, targetUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const messageData = {
      userId: currentUser.uid,
      userName: currentUser.displayName || 'Me',
      userPhotoURL: currentUser.photoURL,
      content: newMessage.trim(),
      createdAt: serverTimestamp(),
      channelId: conversationId // Reusing schema field
    };

    try {
      setNewMessage('');
      await addDoc(collection(db, `conversations/${conversationId}/messages`), messageData);
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: messageData.content,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `conversations/${conversationId}/messages`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col w-full max-w-md mx-auto shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 border-b border-dark-border flex items-center justify-between bg-black/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-dark-surface rounded-full flex items-center justify-center border border-dark-border text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-sm leading-none">{targetUserName}</h2>
            <p className="text-[10px] text-brand-cyan uppercase tracking-widest mt-1">Direct Message</p>
          </div>
        </div>
        <button className="text-gray-600 hover:text-white">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
            <MessageCircle className="w-8 h-8" />
            <p className="text-sm">Start of your conversation</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.userId === currentUser?.uid;
            return (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <div 
                  className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden shrink-0 border border-white/10"
                >
                  {msg.userPhotoURL ? (
                    <img src={msg.userPhotoURL} alt={msg.userName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] bg-brand-cyan/20 text-brand-cyan uppercase">
                      {msg.userName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className={`max-w-[75%] p-3 rounded-2xl text-sm leading-relaxed ${
                  isMe ? 'bg-brand-cyan text-black rounded-br-none' : 'bg-dark-surface text-white rounded-bl-none border border-dark-border shadow-sm'
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={scrollRef} className="h-4" />
      </div>

      {/* Input Area - Compact for mobile usability */}
      <div className="flex-none p-3 pb-6 border-t border-dark-border bg-black">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <input
              autoFocus
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full bg-dark-surface border border-dark-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-cyan transition-all placeholder:text-gray-600 shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 bg-brand-cyan text-black rounded-xl flex items-center justify-center disabled:opacity-30 disabled:grayscale transition-all active:scale-95 shadow-lg shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
