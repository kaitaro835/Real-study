import React, { useState, useEffect, useRef } from 'react';
import { Hash, Search, Plus, ThumbsUp, ChevronLeft, Send, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp, where, doc, getDoc } from 'firebase/firestore';
import { Channel, Message, OperationType, Conversation, UserProfile } from '../types';
import { handleFirestoreError } from '../lib/utils';

interface CommunityViewProps {
  onViewProfile?: (userId: string) => void;
  onStartDM?: (userId: string, userName: string) => void;
}

export const CommunityView: React.FC<CommunityViewProps> = ({ onViewProfile, onStartDM }) => {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationUsers, setConversationUsers] = useState<Record<string, UserProfile>>({});
  const [channels, setChannels] = useState<Channel[]>([
    { id: '1', name: 'GOOD MORNING', icon: '☀️', description: 'Start your day right' },
    { id: '2', name: 'TALKING', icon: '🗣️', description: 'General chat' },
    { id: '3', name: 'LEARNING', icon: '📚', description: 'Deep work and study' },
    { id: '4', name: 'GRATITUDE JOURNAL', icon: '🙏', description: 'Be thankful' },
    { id: '5', name: 'COMMITMENT', icon: '🔥', description: 'Hardcore focus' },
    { id: '6', name: 'FOOD SHARE', icon: '🍖', description: 'Fuel for study' },
  ]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('updatedAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Conversation[];
      setConversations(convs);

      // Fetch profiles for participants we don't have yet
      for (const conv of convs) {
        const otherId = conv.participants.find(p => p !== auth.currentUser?.uid);
        if (otherId && !conversationUsers[otherId]) {
          const userDoc = await getDoc(doc(db, 'users', otherId));
          if (userDoc.exists()) {
            setConversationUsers(prev => ({ ...prev, [otherId]: userDoc.data() as UserProfile }));
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  if (selectedChannel) {
    return <ChatRoom channel={selectedChannel} onBack={() => setSelectedChannel(null)} onViewProfile={onViewProfile} />;
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-32">
      <div className="flex items-center justify-between mb-8 px-2">
        <h1 className="text-2xl font-bold tracking-tight">Community</h1>
        <button className="w-10 h-10 bg-dark-surface rounded-full flex items-center justify-center border border-dark-border text-brand-cyan">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search channels..."
          className="w-full bg-dark-surface border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-sm focus:border-brand-cyan outline-none transition-colors"
        />
      </div>

      <div className="space-y-8">
        <section className="space-y-3">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">
            Direct Messages
          </h3>
          <div className="space-y-1">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-dark-surface/10 rounded-3xl border border-dashed border-white/5">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const otherId = conv.participants.find(p => p !== auth.currentUser?.uid);
                const otherUser = otherId ? conversationUsers[otherId] : null;

                if (!otherId) return null;

                return (
                  <motion.button
                    key={conv.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onStartDM?.(otherId, otherUser?.displayName || 'User')}
                    className="w-full flex items-center justify-between p-4 rounded-3xl bg-dark-surface/30 hover:bg-dark-surface border border-transparent hover:border-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/10 relative">
                        {otherUser?.photoURL ? (
                          <img src={otherUser.photoURL} alt={otherUser.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand-cyan">
                            {otherUser?.displayName?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-sm group-hover:text-brand-cyan transition-colors">
                          {otherUser?.displayName || 'User'}
                        </h4>
                        <p className="text-[10px] text-gray-500 truncate max-w-[180px]">
                          {conv.lastMessage || 'Sent a focus signal'}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">
            Rooms
          </h3>
          <div className="space-y-1">
            {channels.map((channel) => (
              <motion.button
                key={channel.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedChannel(channel)}
                className="w-full flex items-center justify-between p-4 rounded-3xl bg-dark-surface/30 hover:bg-dark-surface border border-transparent hover:border-white/10 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-xl">
                    {channel.icon || <Hash className="w-4 h-4" />}
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-sm group-hover:text-brand-cyan transition-colors">
                      {channel.name}
                    </h4>
                    <p className="text-[10px] text-gray-500">{channel.description}</p>
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border-2 border-black bg-gray-800"
                    />
                  ))}
                  <div className="w-5 h-5 rounded-full border-2 border-black bg-dark-surface flex items-center justify-center text-[8px] text-gray-400">
                    +4
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

interface ChatRoomProps {
  channel: Channel;
  onBack: () => void;
  onViewProfile?: (userId: string) => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ channel, onBack, onViewProfile }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, `channels/${channel.id}/messages`),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
      setMessages(msgs);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `channels/${channel.id}/messages`);
    });

    return () => unsubscribe();
  }, [channel.id]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    const content = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, `channels/${channel.id}/messages`), {
        channelId: channel.id,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Focus Miner',
        userPhotoURL: auth.currentUser.photoURL,
        content,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `channels/${channel.id}/messages`);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-black pb-32">
      <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-black/80 backdrop-blur-xl sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-dark-surface flex items-center justify-center text-xl">
            {channel.icon}
          </div>
          <div>
            <h3 className="font-bold text-sm leading-none">{channel.name}</h3>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-1">
              Active Now
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((msg) => {
          const isMe = msg.userId === auth.currentUser?.uid;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: isMe ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
            >
              <div 
                onClick={() => onViewProfile?.(msg.userId)}
                className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden shrink-0 border border-white/10 cursor-pointer hover:border-brand-cyan transition-colors"
              >
                {msg.userPhotoURL ? (
                  <img src={msg.userPhotoURL} alt={msg.userName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold uppercase">
                    {msg.userName[0]}
                  </div>
                )}
              </div>
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-brand-cyan text-black rounded-br-none'
                    : 'bg-dark-surface text-gray-200 rounded-bl-none'
                }`}
              >
                <p>{msg.content}</p>
              </div>
            </motion.div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-black/80 backdrop-blur-xl border-t border-white/5 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Send a focus signal..."
          className="flex-1 bg-dark-surface border border-white/5 rounded-2xl px-4 py-3 text-sm focus:border-brand-cyan outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-brand-cyan text-black w-12 h-12 rounded-2xl flex items-center justify-center disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
