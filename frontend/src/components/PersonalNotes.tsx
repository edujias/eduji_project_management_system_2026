'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  FileText, 
  Save, 
  Sparkles,
  ClipboardList,
  Edit3
} from 'lucide-react';

interface PersonalNotesProps {
  currentUser: User;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export function PersonalNotes({ currentUser }: PersonalNotesProps) {
  // To-Do list state
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoInput, setTodoInput] = useState('');
  
  // Note text state
  const [noteContent, setNoteContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');

  // Load user data on mount / user change
  useEffect(() => {
    // 1. Load Todos
    const savedTodos = localStorage.getItem(`personal_todos_${currentUser.id}`);
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos));
    } else {
      // Default initial todos for welcome feel
      const initial: TodoItem[] = [
        { id: '1', text: 'Eduji platformunda yeni görev oluştur', completed: true, createdAt: new Date().toISOString() },
        { id: '2', text: 'Proje Analitiği ekranını incele', completed: false, createdAt: new Date().toISOString() },
        { id: '3', text: 'Çalışan yetkilerini kontrol et', completed: false, createdAt: new Date().toISOString() },
      ];
      setTodos(initial);
      localStorage.setItem(`personal_todos_${currentUser.id}`, JSON.stringify(initial));
    }

    // 2. Load Note
    const savedNote = localStorage.getItem(`personal_note_${currentUser.id}`);
    if (savedNote) {
      setNoteContent(savedNote);
    } else {
      const initialNote = `📝 Kişisel Çalışma Not Defteri\n---------------------------------\nBuraya kendinize özel iş notlarını, hatırlatıcıları veya toplantı detaylarını yazabilirsiniz.\n\nBu notlar tamamen size özeldir ve tarayıcınızda otomatik olarak kaydedilir.`;
      setNoteContent(initialNote);
      localStorage.setItem(`personal_note_${currentUser.id}`, initialNote);
    }
  }, [currentUser.id]);

  // Save todos helper
  const saveTodos = (updatedTodos: TodoItem[]) => {
    setTodos(updatedTodos);
    localStorage.setItem(`personal_todos_${currentUser.id}`, JSON.stringify(updatedTodos));
  };

  // Add todo handler
  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoInput.trim()) return;

    const newItem: TodoItem = {
      id: `todo-${Math.random()}`,
      text: todoInput.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [...todos, newItem];
    saveTodos(updated);
    setTodoInput('');
  };

  // Toggle todo handler
  const handleToggleTodo = (id: string) => {
    const updated = todos.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    saveTodos(updated);
  };

  // Delete todo handler
  const handleDeleteTodo = (id: string) => {
    const updated = todos.filter(item => item.id !== id);
    saveTodos(updated);
  };

  // Auto-saving Notepad handler (debounce simulation)
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setNoteContent(content);
    setSaveStatus('saving');
    
    // Save instantly to localStorage
    localStorage.setItem(`personal_note_${currentUser.id}`, content);
    
    // Smooth checkmark feedback transition
    setTimeout(() => {
      setSaveStatus('saved');
    }, 600);
  };

  return (
    <div className="h-full flex flex-col p-6 bg-slate-950 overflow-y-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          📝 Notlarım & Kişisel To-Do Listem
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {currentUser.fullName} kullanıcısına ait tamamen gizli ve otomatik kaydedilen çalışma alanı.
        </p>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        
        {/* COLUMN 1: TO-DO CHECKLIST */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-400" />
              Yapılacaklar Listesi ({todos.filter(t => !t.completed).length})
            </h3>
            <span className="text-[10px] text-slate-500 font-medium font-mono uppercase">
              Kişisel Görevlerim
            </span>
          </div>

          {/* Add Todo Input form */}
          <form onSubmit={handleAddTodo} className="flex gap-2">
            <input
              type="text"
              value={todoInput}
              onChange={(e) => setTodoInput(e.target.value)}
              placeholder="Yeni yapılacak iş ekleyin..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={!todoInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-4 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Ekle
            </button>
          </form>

          {/* Todos scroll area */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[350px]">
            {todos.length > 0 ? (
              todos.map((item) => (
                <div 
                  key={item.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition duration-200 group ${
                    item.completed 
                      ? 'bg-slate-950/40 border-slate-900/60 opacity-60' 
                      : 'bg-slate-950 border-slate-800/60 hover:border-slate-700/80'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTodo(item.id)}
                    className="flex items-start gap-3 flex-1 text-left cursor-pointer"
                  >
                    <span className="mt-0.5 flex-shrink-0 text-indigo-400">
                      {item.completed ? (
                        <CheckSquare className="w-4 h-4 text-indigo-500 fill-indigo-500/10" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 hover:text-slate-300" />
                      )}
                    </span>
                    <span className={`text-xs leading-normal font-medium ${
                      item.completed 
                        ? 'line-through text-slate-500' 
                        : 'text-slate-200'
                    }`}>
                      {item.text}
                    </span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleDeleteTodo(item.id)}
                    className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="h-40 border border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-xs text-slate-500">
                Yapılacak iş bulunmuyor, yeni bir tane ekleyebilirsiniz!
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: AUTO-SAVING NOTEPAD */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-400" />
              Özel Not Defteri
            </h3>
            
            {/* Auto-save status feedback */}
            <div className="flex items-center gap-1.5 text-[10px] font-semibold transition-all">
              {saveStatus === 'saving' && (
                <span className="text-amber-400 animate-pulse">Kaydediliyor...</span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                  Kaydedildi
                </span>
              )}
            </div>
          </div>

          {/* Notepad Textarea */}
          <div className="flex-1 flex flex-col">
            <textarea
              value={noteContent}
              onChange={handleNoteChange}
              placeholder="Çalışma notlarınızı, karalamalarınızı buraya yazın..."
              className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs leading-relaxed text-slate-200 focus:outline-none focus:border-indigo-500 transition resize-none min-h-[350px]"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
