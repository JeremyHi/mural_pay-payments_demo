#!/usr/bin/env ts-node
/**
 * Script to check Mural Pay webhook configuration for local development
 * Run with: npx ts-node check-webhook-config.ts
 */

import { listWebhooks, getWebhook, updateWebhook, createWebhook } from './src/lib/mural';

const LOCAL_WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3001/api/webhooks/mural';
const REQUIRED_EVENT_CATEGORIES = ['MURAL_ACCOUNT_BALANCE_ACTIVITY', 'PAYOUT_REQUEST'];

async function checkWebhookConfiguration() {
    console.log('🔍 Checking Mural Pay Webhook Configuration...\n');
    console.log(`API Base URL: ${process.env.MURAL_API_BASE_URL || 'https://api-staging.muralpay.com'}`);
    console.log(`Expected Webhook URL: ${LOCAL_WEBHOOK_URL}\n`);

    try {
        // List all webhooks
        console.log('📋 Fetching webhook configuration...');
        const webhooks = await listWebhooks();

        console.log(`Found ${webhooks.results.length} webhook(s):\n`);

        if (webhooks.results.length === 0) {
            console.log('⚠️  No webhooks configured!');
            console.log('\n💡 To create a webhook for local development:');
            console.log('   1. Use a tunnel service (ngrok, localtunnel) to expose localhost');
            console.log('   2. Create webhook pointing to your public URL');
            console.log('   3. Enable it (set status to ACTIVE)');
            return;
        }

        // Check each webhook
        for (const webhook of webhooks.results) {
            console.log(`Webhook ID: ${webhook.id}`);
            console.log(`  URL: ${webhook.url}`);
            console.log(`  Status: ${webhook.status}`);
            console.log(`  Event Categories: ${webhook.eventCategories.join(', ')}`);
            console.log(`  Created: ${webhook.createdAt}`);
            console.log(`  Updated: ${webhook.updatedAt}`);
            console.log('');

            // Check if URL matches local setup
            const isLocalhost = webhook.url.includes('localhost') || webhook.url.includes('127.0.0.1');
            const isNgrok = webhook.url.includes('ngrok') || webhook.url.includes('localtunnel');

            if (isLocalhost) {
                console.log('  ⚠️  WARNING: Webhook URL points to localhost!');
                console.log('     Mural Pay cannot reach localhost directly.');
                console.log('     Use a tunnel service (ngrok, localtunnel) to expose your local server.\n');
            } else if (isNgrok) {
                console.log('  ✅ Webhook URL appears to use a tunnel (good for local dev)\n');
            } else {
                console.log('  ℹ️  Webhook URL appears to be a public URL\n');
            }

            // Check status
            if (webhook.status !== 'ACTIVE') {
                console.log('  ⚠️  WARNING: Webhook is DISABLED!');
                console.log('     Events will not be sent until webhook is enabled.\n');
            } else {
                console.log('  ✅ Webhook is ACTIVE\n');
            }

            // Check event categories
            const hasRequiredEvents = REQUIRED_EVENT_CATEGORIES.every(cat =>
                webhook.eventCategories.includes(cat)
            );

            if (!hasRequiredEvents) {
                console.log('  ⚠️  WARNING: Missing required event categories!');
                console.log(`     Required: ${REQUIRED_EVENT_CATEGORIES.join(', ')}`);
                console.log(`     Configured: ${webhook.eventCategories.join(', ')}\n`);
            } else {
                console.log('  ✅ All required event categories are configured\n');
            }
        }

        // Summary
        console.log('📊 Summary:');
        const activeWebhooks = webhooks.results.filter(w => w.status === 'ACTIVE');
        console.log(`  - Total webhooks: ${webhooks.results.length}`);
        console.log(`  - Active webhooks: ${activeWebhooks.length}`);
        console.log(`  - Disabled webhooks: ${webhooks.results.length - activeWebhooks.length}`);

        if (activeWebhooks.length === 0) {
            console.log('\n❌ No active webhooks found. Webhooks must be ACTIVE to receive events.');
        }

    } catch (error) {
        console.error('❌ Error checking webhook configuration:', error);
        if (error instanceof Error) {
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                console.error('\n💡 Check your MURAL_API_KEY environment variable');
            }
        }
    }
}

// Run the check
checkWebhookConfiguration().catch(console.error);
