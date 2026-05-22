import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock del cliente Supabase: sin sesión, sin red.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        cb('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: () => undefined } } };
      },
    },
  },
}));

import { AuthProvider } from '@/lib/auth/auth-context';
import App from './App';

describe('App', () => {
  it('redirige al login cuando no hay sesión', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Iniciar sesión')).toBeInTheDocument();
  });
});
