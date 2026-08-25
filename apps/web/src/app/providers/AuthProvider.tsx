import React from 'react';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Auth state is managed by zustand store (authStore)
  // This provider can be extended for auth context if needed
  return <>{children}</>;
};

export default AuthProvider;
