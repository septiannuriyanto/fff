const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Basic validation that we have a body
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const body = await req.json().catch(() => ({}))
    const { chat_id, message_thread_id, text, parse_mode = 'Markdown' } = body

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const defaultChatId = Deno.env.get('TELEGRAM_GROUP_ID')

    if (!botToken) {
      console.error('Environment Error: TELEGRAM_BOT_TOKEN is missing')
      return new Response(JSON.stringify({ error: 'Server Config Error: TELEGRAM_BOT_TOKEN is not set.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const finalChatId = chat_id || defaultChatId
    if (!finalChatId) {
      console.error('Request Error: No target chat_id provided and no default set')
      return new Response(JSON.stringify({ error: 'Target Error: chat_id is missing and TELEGRAM_GROUP_ID is not set.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!text) {
      return new Response(JSON.stringify({ error: 'Content Error: text is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: finalChatId,
        message_thread_id,
        text,
        parse_mode,
      }),
    })

    const result = await response.json()

    if (!result.ok) {
      console.error('Telegram API Error:', result.description)
      return new Response(JSON.stringify({ error: result.description }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, data: result.result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Internal Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
