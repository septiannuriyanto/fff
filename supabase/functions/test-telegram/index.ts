import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const threadId = Deno.env.get('THREAD_ID_DAILY_REPORT')

    console.log(`Testing Telegram with Thread ID: ${threadId}`)

    const notifyUrl = `${supabaseUrl}/functions/v1/telegram-notification`
    
    const response = await fetch(notifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`
      },
      body: JSON.stringify({
        message_thread_id: threadId ? Number(threadId) : undefined,
        text: "🔔 *TEST NOTIFICATION*\nThis is a test from the coordination system.",
        parse_mode: 'Markdown'
      })
    })

    const result = await response.json()

    return new Response(JSON.stringify({ 
      success: response.ok, 
      thread_used: threadId,
      result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
