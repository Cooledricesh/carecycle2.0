import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface {{StoreName}}State {
  // Define state properties
}

interface {{StoreName}}Actions {
  // Define actions
}

type {{StoreName}}Store = {{StoreName}}State & {{StoreName}}Actions;

export const use{{StoreName}}Store = create<{{StoreName}}Store>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state

        // Actions
      }),
      {
        name: '{{store-name}}-storage',
      }
    )
  )
);