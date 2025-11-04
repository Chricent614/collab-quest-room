import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const VAPID_PUBLIC_KEY = 'BKt8VqJlQr8K9JVLXKmYnwHV3ym_7jGVMx9sZqOqR3_8PYzV-wN1YlHJ8hXFmR3jQ9dYVX8wKqR3_8PYzV-wN1Yl';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      registerServiceWorker();
    }
  }, []);

  useEffect(() => {
    if (user && registration) {
      checkSubscription();
    }
  }, [user, registration]);

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered:', reg);
      setRegistration(reg);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const checkSubscription = async () => {
    if (!registration) return;

    try {
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async () => {
    if (!registration || !user) return;

    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast({
          title: 'Permission denied',
          description: 'Please allow notifications to receive updates.',
          variant: 'destructive'
        });
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { error: upsertError } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: profile.id,
          subscription: subscription.toJSON() as any
        })
        .select()
        .single();

      if (upsertError && upsertError.code !== '23505') {
        throw upsertError;
      }

      setIsSubscribed(true);
      
      toast({
        title: 'Success!',
        description: 'Push notifications enabled.'
      });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable push notifications.',
        variant: 'destructive'
      });
    }
  };

  const unsubscribe = async () => {
    if (!registration || !user) return;

    try {
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', profile.id);
      }

      setIsSubscribed(false);
      
      toast({
        title: 'Success',
        description: 'Push notifications disabled.'
      });
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
    }
  };

  return {
    isSupported,
    isSubscribed,
    subscribe,
    unsubscribe
  };
};
