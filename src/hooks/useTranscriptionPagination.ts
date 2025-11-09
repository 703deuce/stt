'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  getDocs,
  onSnapshot,
  DocumentData,
  QueryConstraint,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { STTRecord } from '@/services/databaseService';

type StatusFilter = STTRecord['status'];

interface UseTranscriptionPaginationOptions {
  pageSize?: number;
  status?: StatusFilter | StatusFilter[];
  enableRealtime?: boolean;
  realtimeLimit?: number;
}

interface UseTranscriptionPaginationResult {
  items: STTRecord[];
  loadingInitial: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const toStatusArray = (status?: StatusFilter | StatusFilter[]): StatusFilter[] | undefined => {
  if (!status) return undefined;
  return Array.isArray(status) ? status : [status];
};

const toDate = (value: any): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  if (value && typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }

  if (typeof value === 'object' && typeof value?.seconds === 'number') {
    const nanoseconds = typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
    return new Date(value.seconds * 1000 + nanoseconds / 1_000_000);
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const getRecordTimestamp = (record: STTRecord): number => {
  const sources = [
    record.completedAt,
    record.timestamp,
    record.createdAt,
    record.startedAt,
    record.queuedAt,
  ];

  for (const source of sources) {
    const date = toDate(source);
    if (date) {
      return date.getTime();
    }
  }

  return 0;
};

export function useTranscriptionPagination(
  userId: string | undefined,
  options: UseTranscriptionPaginationOptions = {},
): UseTranscriptionPaginationResult {
  const {
    pageSize = 20,
    status,
    enableRealtime = true,
    realtimeLimit = 20,
  } = options;

  const statusArray = useMemo(() => toStatusArray(status), [status]);
  const statusKey = useMemo(() => (statusArray ? [...statusArray].sort().join(',') : ''), [statusArray]);

  const [items, setItems] = useState<STTRecord[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot<DocumentData> | null>(null);

  const buildConstraints = useCallback(
    (limitSize: number, startAfterDoc?: DocumentSnapshot<DocumentData>) => {
      const constraints: QueryConstraint[] = [];

      if (statusArray && statusArray.length > 0) {
        if (statusArray.length === 1) {
          constraints.push(where('status', '==', statusArray[0]));
        } else {
          constraints.push(where('status', 'in', statusArray));
        }
      }

      constraints.push(orderBy('timestamp', 'desc'));

      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }

      constraints.push(firestoreLimit(limitSize));

      return constraints;
    },
    [statusArray],
  );

  const mergeRecords = useCallback((incoming: STTRecord[], replace = false) => {
    setItems((prev) => {
      if (replace) {
        const sorted = [...incoming].sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
        return sorted;
      }

      const map = new Map<string, STTRecord>();
      prev.forEach((record) => {
        if (record.id) {
          map.set(record.id, record);
        }
      });

      incoming.forEach((record) => {
        if (record.id) {
          map.set(record.id, record);
        }
      });

      const merged = Array.from(map.values());
      merged.sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
      return merged;
    });
  }, []);

  const loadInitial = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setHasMore(false);
      setLastDoc(null);
      return;
    }

    setLoadingInitial(true);
    setError(null);

    try {
      const sttRef = collection(db, 'users', userId, 'stt');
      const q = query(sttRef, ...buildConstraints(pageSize));
      const snapshot = await getDocs(q);

      const records: STTRecord[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as STTRecord[];

      mergeRecords(records, true);
      setLastDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err) {
      console.error('Error loading transcriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transcriptions');
    } finally {
      setLoadingInitial(false);
    }
  }, [userId, buildConstraints, mergeRecords, pageSize]);

  const loadMore = useCallback(async () => {
    if (!userId || loadingMore || !hasMore || !lastDoc) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const sttRef = collection(db, 'users', userId, 'stt');
      const q = query(sttRef, ...buildConstraints(pageSize, lastDoc));
      const snapshot = await getDocs(q);

      const records: STTRecord[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as STTRecord[];

      mergeRecords(records);
      setLastDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : lastDoc);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err) {
      console.error('Error loading more transcriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load more transcriptions');
    } finally {
      setLoadingMore(false);
    }
  }, [userId, loadingMore, hasMore, lastDoc, buildConstraints, pageSize, mergeRecords]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial, statusKey]);

  useEffect(() => {
    if (!userId || !enableRealtime) {
      return;
    }

    const sttRef = collection(db, 'users', userId, 'stt');
    const realtimeConstraints = buildConstraints(Math.max(realtimeLimit, pageSize));
    const realtimeQuery = query(sttRef, ...realtimeConstraints);

    const unsubscribe = onSnapshot(
      realtimeQuery,
      (snapshot) => {
        const records: STTRecord[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as STTRecord[];

        mergeRecords(records);
      },
      (err) => {
        console.error('Realtime transcription listener error:', err);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [userId, enableRealtime, buildConstraints, mergeRecords, realtimeLimit, pageSize]);

  const refresh = useCallback(() => loadInitial(), [loadInitial]);

  return {
    items,
    loadingInitial,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}


