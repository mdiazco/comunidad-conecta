import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return { user, loading };
}

export function useUserCommunities(userEmail) {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) return;
    base44.entities.CommunityMember.filter({ user_email: userEmail, status: 'active' })
      .then(m => { setMemberships(m); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userEmail]);

  return { memberships, loading };
}