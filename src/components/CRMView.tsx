import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, 
  MessageSquare, 
  Send, 
  User, 
  Phone, 
  CheckCheck,
  ChevronLeft,
  X,
  Loader2,
  Plus,
  MoreVertical
} from "lucide-react";
import { 
  Lead, 
  BaseEntry, 
  UserProfile, 
  FiesProuniEntry,
  GapEntry,
  Conversation,
  Message
} from "../types";
import { cn, formatPhone } from "../lib/utils";
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  where,
  limit,
  setDoc,
  doc,
  updateDoc,
  getDocs
} from "firebase/firestore";
import { db, COLLECTIONS } from "../firebase";
import { motion, AnimatePresence } from "motion/react";

interface CRMViewProps {
  leads: Lead[];
  bases: BaseEntry[];
  fiesProuni: FiesProuniEntry[];
  gap: GapEntry[];
  profile: UserProfile;
  onSendBot: (tel: string, msg: string, contactName?: string) => Promise<void>;
  onToast: (m: string, t?: "success" | "error") => void;
}

export default function CRMView({
  leads,
  bases,
  fiesProuni,
  gap,
  profile,
  onSendBot,
  onToast
}: CRMViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!profile) return;
    
    const q = query(
      collection(db, COLLECTIONS.CONVERSATIONS),
      orderBy("lastMessageTimestamp", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];
      setConversations(convs);
    });

    return () => unsubscribe();
  }, [profile]);

  // Load messages for selected chat
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where("receiverPhone", "==", selectedChat.contactPhone),
      orderBy("timestamp", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
      
      // Update unread count if we are in the chat
      if (selectedChat.unreadCount > 0) {
        updateDoc(doc(db, COLLECTIONS.CONVERSATIONS, selectedChat.id), {
          unreadCount: 0
        });
      }

      // Check if the last message needs sentiment analysis
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.type === 'received' && !selectedChat.sentiment) {
        analyzeSentiment(lastMsg.text, selectedChat.id);
      }
    });

    return () => unsubscribe();
  }, [selectedChat]);

  const analyzeSentiment = async (text: string, conversationId: string) => {
    try {
      const res = await fetch("/api/crm/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success && data.sentiment) {
        await updateDoc(doc(db, COLLECTIONS.CONVERSATIONS, conversationId), {
          sentiment: data.sentiment
        });
      }
    } catch (e) {
      console.error("Error analyzing sentiment:", e);
    }
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Search results for starting new chats
  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.length < 3) return [];
    
    const lowerSearch = searchTerm.toLowerCase();
    const results: { id: string; name: string; phone: string; type: string }[] = [];

    leads.forEach(l => {
      if (l.nome?.toLowerCase().includes(lowerSearch) || l.telefone?.includes(searchTerm)) {
        results.push({ id: l.id, name: l.nome, phone: l.telefone, type: "Lead" });
      }
    });

    bases.forEach(b => {
      if (b.nome?.toLowerCase().includes(lowerSearch) || b.telefone?.includes(searchTerm)) {
        results.push({ id: b.id, name: b.nome, phone: b.telefone, type: "Base" });
      }
    });

    fiesProuni.forEach(f => {
      if (f.nome?.toLowerCase().includes(lowerSearch) || f.telefone?.includes(searchTerm)) {
        results.push({ id: f.id, name: f.nome, phone: f.telefone, type: "Fies/Prouni" });
      }
    });

    gap.forEach(g => {
      if (g.nome?.toLowerCase().includes(lowerSearch) || g.telefone?.includes(searchTerm)) {
        results.push({ id: g.id, name: g.nome, phone: g.telefone, type: "Gap" });
      }
    });

    // Deduplicate by phone
    const unique = Array.from(new Map(results.map(r => [r.phone, r])).values());
    return unique.slice(0, 10);
  }, [searchTerm, leads, bases, fiesProuni, gap]);

  const handleStartChat = async (contact: { name: string; phone: string }) => {
    const chatPhone = contact.phone.replace(/\D/g, "");
    if (!chatPhone) return;

    const existing = conversations.find(c => c.contactPhone === chatPhone);
    if (existing) {
      setSelectedChat(existing);
      setIsSearchOpen(false);
      setSearchTerm("");
      return;
    }

    const newConv: Conversation = {
      id: chatPhone,
      contactPhone: chatPhone,
      contactName: contact.name,
      lastMessage: "Início da conversa",
      lastMessageTimestamp: serverTimestamp(),
      unreadCount: 0,
      assignedTo: profile.uid,
      unidade: profile.unidade
    };

    await setDoc(doc(db, COLLECTIONS.CONVERSATIONS, chatPhone), newConv);
    setSelectedChat(newConv);
    setIsSearchOpen(false);
    setSearchTerm("");
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    setLoading(true);
    const msgText = newMessage.trim();
    setNewMessage("");

    try {
      // 1. Send via bot
      await onSendBot(selectedChat.contactPhone, msgText, selectedChat.contactName);

      // The onSendBot function already logs the message and updates the conversation
      // We don't need to do it here again.
    } catch (error: any) {
      onToast(`Erro ao enviar mensagem: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex">
      {/* Sidebar - Chat List */}
      <div className={cn(
        "w-full md:w-80 border-r border-slate-100 flex flex-col transition-all",
        selectedChat ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={20} className="text-blue-500" />
            CRM WhatsApp
          </h2>
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="p-2 hover:bg-blue-50 text-blue-600 rounded-full transition-colors"
            title="Nova Conversa"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {conversations.length === 0 ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                <MessageSquare size={24} />
              </div>
              <p className="text-sm text-slate-500">Nenhuma conversa encontrada.</p>
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Buscar contato
              </button>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedChat(conv)}
                className={cn(
                  "w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 relative",
                  selectedChat?.id === conv.id ? "bg-blue-50/50" : ""
                )}
              >
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  {conv.contactName?.charAt(0).toUpperCase() || <User size={20} />}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-800 truncate">{conv.contactName}</span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {conv.lastMessageTimestamp?.seconds 
                        ? new Date(conv.lastMessageTimestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-500 truncate flex-1">{conv.lastMessage}</p>
                    <div className="w-16 flex justify-end">
                      {conv.sentiment && (
                        <span className={cn(
                          "text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider",
                          conv.sentiment === "Positivo" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                          conv.sentiment === "Negativo" ? "bg-rose-100 text-rose-700 border border-rose-200" :
                          "bg-slate-100 text-slate-600 border border-slate-200"
                        )}>
                          {conv.sentiment}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="absolute right-4 bottom-4 bg-emerald-500 text-white text-[10px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-slate-50 transition-all",
        !selectedChat ? "hidden md:flex" : "flex"
      )}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                  {selectedChat.contactName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 leading-none">{selectedChat.contactName}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">{formatPhone(selectedChat.contactPhone)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                  <Phone size={20} />
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex flex-col max-w-[80%] space-y-1",
                    msg.type === 'sent' ? "ml-auto items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm shadow-sm relative",
                    msg.type === 'sent' 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                  )}>
                    {msg.text}
                    <div className={cn(
                      "flex items-center gap-1 mt-1 justify-end",
                      msg.type === 'sent' ? "text-blue-100" : "text-slate-400"
                    )}>
                      <span className="text-[10px]">
                        {msg.timestamp?.seconds 
                          ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                      {msg.type === 'sent' && <CheckCheck size={12} />}
                    </div>
                  </div>
                  {msg.type === 'sent' && (
                    <span className="text-[9px] text-slate-400 font-medium px-1">
                      Enviado por {msg.senderName} ({msg.senderRole})
                    </span>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !newMessage.trim()}
                  className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
            <div className="w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center text-blue-500 relative">
              <MessageSquare size={48} />
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full border-4 border-slate-50">
                <CheckCheck size={20} />
              </div>
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-xl font-bold text-slate-800">Bem-vindo ao CRM WhatsApp</h3>
              <p className="text-slate-500 text-sm">
                Selecione uma conversa ao lado ou busque um novo contato para iniciar um atendimento direto pelo seu robô.
              </p>
            </div>
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
            >
              Novo Atendimento
            </button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50">
                <h3 className="text-xl font-bold text-slate-800">Novo Atendimento</h3>
                <button 
                  onClick={() => setIsSearchOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="p-6 flex flex-col flex-1 overflow-hidden">
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Pesquise por nome ou telefone..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {searchTerm.length >= 3 ? (
                    searchResults.length > 0 ? (
                      searchResults.map((result) => (
                        <button
                          key={result.phone}
                          onClick={() => handleStartChat(result)}
                          className="w-full p-4 rounded-2xl border border-slate-50 hover:border-blue-100 hover:bg-blue-50/30 transition-all text-left flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                              <User size={24} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{result.name}</p>
                              <p className="text-xs text-slate-400 font-mono">{formatPhone(result.phone)}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{result.type}</span>
                            <Plus size={18} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-400">
                        Nenhum contato encontrado para "{searchTerm}"
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12 space-y-2">
                      <Search size={32} className="mx-auto text-slate-200" />
                      <p className="text-sm text-slate-400">Digite pelo menos 3 caracteres para pesquisar.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
