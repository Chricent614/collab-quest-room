import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  link?: string;
  type?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    console.log('Received push request:', payload);

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', payload.user_id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found for user:', payload.user_id);
      return new Response(
        JSON.stringify({ message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Send push notification to each subscription
    const pushPromises = subscriptions.map(async (sub) => {
      try {
        const subscription = sub.subscription;
        
        // Import web-push
        const webpush = await import('npm:web-push@3.6.6');
        
        webpush.setVapidDetails(
          vapidSubject,
          Deno.env.get('VAPID_PUBLIC_KEY')!,
          vapidPrivateKey
        );

        const notificationPayload = JSON.stringify({
          title: payload.title,
          body: payload.body,
          link: payload.link || '/',
          type: payload.type || 'notification'
        });

        await webpush.sendNotification(subscription, notificationPayload);
        console.log('Push notification sent successfully');
      } catch (error) {
        console.error('Error sending push notification:', error);
        // Don't throw, continue with other subscriptions
      }
    });

    await Promise.all(pushPromises);

    return new Response(
      JSON.stringify({ success: true, sent: subscriptions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in send-push function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
