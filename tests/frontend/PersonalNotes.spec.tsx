import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonalNotes } from '@/components/PersonalNotes';
import { User } from '@/types';

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  fullName: 'Test User',
  role: 'EMPLOYEE',
  status: 'ACTIVE',
  createdAt: '2026-07-24T00:00:00.000Z',
};

describe('PersonalNotes Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render component with user info and default notes/todos if none saved', () => {
    render(<PersonalNotes currentUser={mockUser} />);

    // Check Header and user details
    expect(screen.getByText('📝 Notlarım & Kişisel To-Do Listem')).toBeInTheDocument();
    expect(screen.getByText(/Test User kullanıcısına ait tamamen gizli/)).toBeInTheDocument();

    // Check default todos
    expect(screen.getByText('Eduji platformunda yeni görev oluştur')).toBeInTheDocument();
    expect(screen.getByText('Proje Analitiği ekranını incele')).toBeInTheDocument();
    expect(screen.getByText('Çalışan yetkilerini kontrol et')).toBeInTheDocument();

    // Check notepad content
    const textarea = screen.getByPlaceholderText('Çalışma notlarınızı, karalamalarınızı buraya yazın...') as HTMLTextAreaElement;
    expect(textarea.value).toContain('📝 Kişisel Çalışma Not Defteri');
  });

  it('should load saved todos and notes from localStorage', () => {
    const savedTodos = [
      { id: 'todo-x', text: 'Custom Task 1', completed: false, createdAt: new Date().toISOString() },
      { id: 'todo-y', text: 'Custom Task 2', completed: true, createdAt: new Date().toISOString() },
    ];
    localStorage.setItem(`personal_todos_${mockUser.id}`, JSON.stringify(savedTodos));
    localStorage.setItem(`personal_note_${mockUser.id}`, 'Custom Note Content');

    render(<PersonalNotes currentUser={mockUser} />);

    expect(screen.getByText('Custom Task 1')).toBeInTheDocument();
    expect(screen.getByText('Custom Task 2')).toBeInTheDocument();
    
    const textarea = screen.getByPlaceholderText('Çalışma notlarınızı, karalamalarınızı buraya yazın...') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Custom Note Content');
  });

  it('should allow adding a new todo item', () => {
    render(<PersonalNotes currentUser={mockUser} />);

    const input = screen.getByPlaceholderText('Yeni yapılacak iş ekleyin...') as HTMLInputElement;
    const addButton = screen.getByRole('button', { name: /Ekle/i });

    // Type new todo text
    fireEvent.change(input, { target: { value: 'Learn Vitest Unit Testing' } });
    expect(addButton).not.toBeDisabled();

    // Submit form
    fireEvent.click(addButton);

    // Verify it was added to DOM
    expect(screen.getByText('Learn Vitest Unit Testing')).toBeInTheDocument();

    // Verify it was saved to localStorage
    const saved = JSON.parse(localStorage.getItem(`personal_todos_${mockUser.id}`) || '[]');
    expect(saved.some((item: any) => item.text === 'Learn Vitest Unit Testing')).toBe(true);
  });

  it('should allow toggling a todo item completion', () => {
    render(<PersonalNotes currentUser={mockUser} />);

    // Get the first item (Eduji platformunda yeni görev oluştur is checked/completed by default)
    const firstTaskButton = screen.getByRole('button', { name: /Eduji platformunda yeni görev oluştur/i });
    
    // Toggle it (it will become active/incomplete)
    fireEvent.click(firstTaskButton);

    const saved = JSON.parse(localStorage.getItem(`personal_todos_${mockUser.id}`) || '[]');
    const firstItem = saved.find((item: any) => item.id === '1');
    expect(firstItem.completed).toBe(false);
  });

  it('should allow deleting a todo item', () => {
    // Save a custom list first to make it easy to find delete button
    const savedTodos = [
      { id: 'todo-delete-me', text: 'Delete Me Target', completed: false, createdAt: new Date().toISOString() },
    ];
    localStorage.setItem(`personal_todos_${mockUser.id}`, JSON.stringify(savedTodos));

    render(<PersonalNotes currentUser={mockUser} />);

    expect(screen.getByText('Delete Me Target')).toBeInTheDocument();

    const deleteButton = screen.getByTitle('Sil');
    fireEvent.click(deleteButton);

    expect(screen.queryByText('Delete Me Target')).not.toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem(`personal_todos_${mockUser.id}`) || '[]');
    expect(saved.length).toBe(0);
  });

  it('should auto-save notepad content to localStorage on change', async () => {
    render(<PersonalNotes currentUser={mockUser} />);

    const textarea = screen.getByPlaceholderText('Çalışma notlarınızı, karalamalarınızı buraya yazın...') as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: 'Newly updated notepad text' } });

    expect(localStorage.getItem(`personal_note_${mockUser.id}`)).toBe('Newly updated notepad text');
  });
});
