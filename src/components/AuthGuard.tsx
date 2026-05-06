/**
 * AuthGuard.tsx — Route protection component
 *
 * Usage in App.tsx:
 *   <AuthGuard role="host">
 *     <Route path="/events" component={EventList} exact />
 *   </AuthGuard>
 *
 *   <AuthGuard role="donor">
 *     <Route path="/devents" component={DEventList} exact />
 *   </AuthGuard>
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { isAuthenticated, getRole } from '../services/auth';
import type { UserRole } from '../services/auth';

interface AuthGuardProps {
  role?: UserRole;           // If set, also checks role matches
  children: React.ReactNode;
  redirectTo?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  role,
  children,
  redirectTo = '/login',
}) => {
  if (!isAuthenticated()) {
    return <Redirect to={redirectTo} />;
  }

  if (role && getRole() !== role) {
    // Authenticated but wrong role → send to their correct home
    const home = getRole() === 'host' ? '/events' : '/devents';
    return <Redirect to={home} />;
  }

  return <>{children}</>;
};

export default AuthGuard;