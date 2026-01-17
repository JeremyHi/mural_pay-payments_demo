import { NextResponse } from 'next/server';
import { listWebhooks, getWebhook } from '@/lib/mural';

// Mark as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const webhooks = await listWebhooks();
    
    // Handle case where webhooks or results is undefined
    if (!webhooks || !webhooks.results || !Array.isArray(webhooks.results)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid webhook response',
        message: 'Failed to retrieve webhooks. Verify MURAL_API_KEY is set correctly.',
        webhookCount: 0,
        activeCount: 0,
        webhooks: [],
        recommendations: ['Unable to fetch webhooks. Check your API configuration.'],
      }, { status: 500 });
    }
    
    // Check each webhook for localhost/ngrok
    const webhookDetails = await Promise.all(
      webhooks.results.map(async (webhook) => {
        const details = await getWebhook(webhook.id);
        return {
          id: details.id,
          url: details.url,
          status: details.status,
          eventCategories: details.eventCategories,
          createdAt: details.createdAt,
          updatedAt: details.updatedAt,
          isLocalhost: details.url.includes('localhost') || details.url.includes('127.0.0.1'),
          isTunnel: details.url.includes('ngrok') || details.url.includes('localtunnel') || details.url.includes('loca.lt'),
          isActive: details.status === 'ACTIVE',
          hasRequiredEvents: ['MURAL_ACCOUNT_BALANCE_ACTIVITY', 'PAYOUT_REQUEST'].every(
            cat => details.eventCategories.includes(cat)
          ),
        };
      })
    );

    return NextResponse.json({
      success: true,
      webhookCount: webhooks.results.length,
      activeCount: webhookDetails.filter(w => w.isActive).length,
      webhooks: webhookDetails,
      recommendations: generateRecommendations(webhookDetails),
    });
  } catch (error) {
    console.error('Error checking webhooks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to check webhook configuration. Verify MURAL_API_KEY is set correctly.',
      },
      { status: 500 }
    );
  }
}

interface WebhookDetail {
  id: string;
  url: string;
  status: string;
  eventCategories: string[];
  createdAt: string;
  updatedAt: string;
  isLocalhost: boolean;
  isTunnel: boolean;
  isActive: boolean;
  hasRequiredEvents: boolean;
}

function generateRecommendations(webhooks: WebhookDetail[]) {
  const recommendations: string[] = [];

  if (webhooks.length === 0) {
    recommendations.push('No webhooks configured. Create a webhook pointing to your local server (use ngrok/localtunnel for localhost).');
    return recommendations;
  }

  const activeWebhooks = webhooks.filter(w => w.isActive);
  if (activeWebhooks.length === 0) {
    recommendations.push('No active webhooks found. Enable at least one webhook to receive events.');
  }

  webhooks.forEach((webhook, index) => {
    if (webhook.isLocalhost) {
      recommendations.push(`Webhook ${index + 1} (${webhook.id}): URL points to localhost. Use ngrok or localtunnel to expose your local server.`);
    }

    if (!webhook.hasRequiredEvents) {
      recommendations.push(`Webhook ${index + 1} (${webhook.id}): Missing required event categories. Should include MURAL_ACCOUNT_BALANCE_ACTIVITY and PAYOUT_REQUEST.`);
    }
  });

  return recommendations;
}
