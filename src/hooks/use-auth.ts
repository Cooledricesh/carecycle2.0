'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

/**
 * Custom authentication hook that provides a convenient interface to NextAuth session management
 * 
 * @returns {object} Authentication state and methods
 * @returns {object|null} user - Current user object or null if not authenticated
 * @returns {object|null|undefined} session - Full session object from NextAuth
 * @returns {string} status - Session status: 'loading' | 'authenticated' | 'unauthenticated'
 * @returns {boolean} isLoading - True when session is being loaded
 * @returns {boolean} isAuthenticated - True when user is authenticated
 * @returns {boolean} isUnauthenticated - True when user is not authenticated
 * @returns {function} signIn - NextAuth signIn function
 * @returns {function} signOut - NextAuth signOut function  
 * @returns {function} updateSession - Function to update current session
 */
export const useAuth = () => {
  const { data: session, status, update } = useSession();
  
  return {
    user: session?.user || null,
    session,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    isUnauthenticated: status === 'unauthenticated',
    signIn,
    signOut,
    updateSession: update,
  };
};

export default useAuth;