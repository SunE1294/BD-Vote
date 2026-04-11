import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface QueuedTransaction {
  id: string;
  type: 'vote' | 'verification';
  data: unknown;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = 'univote_offline_queue';
const MAX_RETRIES = 3;

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem(QUEUE_KEY);
    if (savedQueue) {
      try {
        setQueue(JSON.parse(savedQueue));
      } catch (e) {
        console.error('Failed to parse offline queue:', e);
      }
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }, [queue]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('ইন্টারনেট সংযোগ পুনরায় স্থাপিত হয়েছে!', {
        description: 'পেন্ডিং ট্রানজ্যাকশন প্রসেস হচ্ছে...',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে', {
        description: 'আপনার ট্রানজ্যাকশন সংরক্ষিত হবে এবং সংযোগ ফিরলে স্বয়ংক্রিয়ভাবে জমা হবে।',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process queue when back online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isProcessing) {
      processQueue();
    }
  }, [isOnline, queue.length]);

  const addToQueue = useCallback((type: QueuedTransaction['type'], data: unknown) => {
    const transaction: QueuedTransaction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    setQueue(prev => [...prev, transaction]);

    if (!isOnline) {
      toast.info('অফলাইন মোড', {
        description: 'আপনার ট্রানজ্যাকশন কিউতে যোগ করা হয়েছে।',
      });
    }

    return transaction.id;
  }, [isOnline]);

  const processQueue = useCallback(async () => {
    if (queue.length === 0 || isProcessing) return;

    setIsProcessing(true);

    // Votes require a short-lived HMAC verification token that was issued at
    // the time of face verification. That token expires in 10 minutes and is
    // tied to a single voter session. We cannot safely replay queued votes
    // without a fresh token — doing so would allow an already-expired or
    // stolen token to submit a vote silently.
    //
    // Instead, inform the voter to go through verification again online.
    for (const transaction of queue) {
      if (transaction.type === 'vote') {
        toast.warning('ভোট দিতে পুনরায় যাচাই প্রয়োজন', {
          description:
            'নিরাপত্তার কারণে অফলাইন ভোট স্বয়ংক্রিয়ভাবে জমা দেওয়া সম্ভব নয়। ' +
            'ইন্টারনেট সংযোগ আসার পর আবার যাচাই করে ভোট দিন।',
          duration: 8000,
        });
      }
    }

    // Clear the queue — stale tokens cannot be reused
    setQueue([]);
    setIsProcessing(false);
  }, [queue, isProcessing]);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  return {
    isOnline,
    queue,
    queueLength: queue.length,
    isProcessing,
    addToQueue,
    removeFromQueue,
    clearQueue,
    processQueue,
  };
}
