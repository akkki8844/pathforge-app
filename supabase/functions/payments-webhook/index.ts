import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Map product_id to credits granted per billing period (monthly bucket model).
// The plan tier IS the monthly credit allotment. These stack on top of the 5/day free.
// Pricing model: $5 per 20 credits, single "Pro" plan with selectable tier.
const PLAN_CREDITS: Record<string, number> = {
  pro_100: 100,
  pro_200: 200,
  pro_500: 500,
  pro_1000: 1000,
  pro_2500: 2500,
  pro_5000: 5000,
  pro_7000: 7000,
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log('Event:', event.eventType, 'env:', env);

    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
        await handleSubscriptionUpsert(event.data, env, event.eventType);
        break;
      case EventName.SubscriptionCanceled:
        await handleSubscriptionCanceled(event.data, env);
        break;
      case EventName.TransactionCompleted:
        console.log('Transaction completed:', event.data.id);
        break;
      case EventName.TransactionPaymentFailed:
        console.log('Payment failed:', event.data.id);
        break;
      default:
        console.log('Unhandled event:', event.eventType);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});

async function handleSubscriptionUpsert(data: any, env: PaddleEnv, eventType: string) {
  const { id, customerId, items, status, currentBillingPeriod, customData, scheduledChange } = data;
  const userId = customData?.userId;
  if (!userId) {
    console.error('No userId in customData');
    return;
  }

  const item = items[0];
  const priceId = item.price.importMeta?.externalId || item.price.id;
  const productId = item.product?.importMeta?.externalId || item.price.productId;

  await supabase.from('subscriptions').upsert({
    user_id: userId,
    paddle_subscription_id: id,
    paddle_customer_id: customerId,
    product_id: productId,
    price_id: priceId,
    status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    cancel_at_period_end: scheduledChange?.action === 'cancel',
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,environment' });

  // Grant credits on creation OR plan change (upgrade/downgrade)
  if (status === 'active' || status === 'trialing') {
    const credits = PLAN_CREDITS[productId] || 0;
    if (credits > 0) {
      const { error } = await supabase.rpc('apply_subscription_credits', {
        target_user_id: userId,
        plan_name: productId,
        credits_to_grant: credits,
      });
      if (error) console.error('apply_subscription_credits error:', error);
    }
  }
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  // Mark canceled but DO NOT revoke credits — user keeps access until current_period_end
  await supabase.from('subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', data.id)
    .eq('environment', env);

  // Note: a scheduled job (or next webhook on period end) should call revert_to_free_plan.
  // Paddle fires subscription.updated with status='canceled' when grace period ends — handled there.
}
