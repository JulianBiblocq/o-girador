import { createContext, useContext } from 'react';

// Default to the global window object. 
// When inside a WindowPortal, this will be overridden with the popup's window object.
export const WindowContext = createContext<Window>(
  typeof window !== 'undefined' ? window : ({} as Window)
);

export const useWindow = () => useContext(WindowContext);
