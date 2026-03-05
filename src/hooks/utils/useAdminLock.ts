/**
 * useAdminLock Hook
 * Manages admin panel locking to prevent concurrent edits
 */

import { useState, useEffect, useCallback } from 'react';

export interface AdminLock {
  userId: string;
  userName: string;
  lockedAt: Date;
  expiresAt: Date;
}

export interface UseAdminLockOptions {
  userId?: string;
  userName?: string;
  enabled?: boolean;
}

export interface UseAdminLockReturn {
  isLocked: boolean;
  lockInfo: AdminLock | null;
  isCheckingLock: boolean;
  releaseLock: () => Promise<void>;
}

export function useAdminLock({
  userId,
  userName,
  enabled = true,
}: UseAdminLockOptions): UseAdminLockReturn {
  const [isLocked, setIsLocked] = useState(false);
  const [lockInfo, setLockInfo] = useState<AdminLock | null>(null);
  const [isCheckingLock, setIsCheckingLock] = useState(true);

  const releaseLock = useCallback(async () => {
    if (!userId) return;

    try {
      await fetch('/api/admin/lock', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      console.error('Error releasing admin lock:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !userName || !enabled) {
      setIsCheckingLock(false);
      return;
    }

    let refreshInterval: NodeJS.Timeout | null = null;

    const checkAndAcquireLock = async () => {
      try {
        // First check if there's an existing lock
        const checkResponse = await fetch('/api/admin/lock');
        const checkData = await checkResponse.json();

        if (checkData.isLocked && checkData.lock?.userId !== userId) {
          // Locked by someone else
          setIsLocked(true);
          setLockInfo(checkData.lock);
          setIsCheckingLock(false);
          return;
        }

        // Try to acquire lock
        const lockResponse = await fetch('/api/admin/lock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, userName }),
        });

        if (lockResponse.ok) {
          setIsLocked(false);
          setLockInfo(null);
          setIsCheckingLock(false);

          // Refresh lock every 30 seconds
          refreshInterval = setInterval(async () => {
            try {
              await fetch('/api/admin/lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userName }),
              });
            } catch (error) {
              console.error('Error refreshing admin lock:', error);
            }
          }, 30000);
        } else {
          const errorData = await lockResponse.json();
          setIsLocked(true);
          setLockInfo(errorData.lock);
          setIsCheckingLock(false);
        }
      } catch (error) {
        console.error('Error checking admin lock:', error);
        setIsCheckingLock(false);
      }
    };

    checkAndAcquireLock();

    // Handle page unload
    const handleBeforeUnload = () => {
      if (userId) {
        const data = new Blob(
          [JSON.stringify({ userId })],
          { type: 'application/json' }
        );
        navigator.sendBeacon('/api/admin/lock?_method=DELETE', data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      releaseLock();
    };
  }, [userId, userName, enabled, releaseLock]);

  return {
    isLocked,
    lockInfo,
    isCheckingLock,
    releaseLock,
  };
}

export default useAdminLock;
