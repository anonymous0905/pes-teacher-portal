import '@testing-library/jest-dom';

// Mock next/navigation for components that use it
jest.mock('next/navigation', () => {
  return {
    useRouter: () => ({ push: jest.fn() }),
    usePathname: () => '',
  };
});

// Basic supabase client mock to avoid real network requests
jest.mock('@/lib/supabase', () => {
  const mock = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: jest.fn(() => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockReturnThis() })),
  };
  return { supabase: mock };
});

// Provide a basic fetch mock
global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })) as any;

import React from 'react';
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: (props: any) => React.createElement('div', props, props.children),
}));

// Mock ResizeObserver used by recharts
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserver;
