import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

// Smart merge: updates a nested parameter by path, preserving existing manual data for arrays
const updateRecursive = (params: any[], path: string[], newValue: any): any[] => {
    if (path.length === 0) return params;
    const [currentKey, ...rest] = path;

    return params.map(p => {
        if (p.key !== currentKey) return p;

        if (rest.length === 0) {
            // For array values (e.g. FT Breakdowns): smart merge preserves existing steps/remarks
            if (Array.isArray(newValue) && Array.isArray(p.value)) {
                return {
                    ...p,
                    value: newValue.map((newItemKey: string) => {
                        const existing = p.value.find((v: any) => v.key === newItemKey);
                        return existing ?? { key: newItemKey, value: 'OPEN', steps: [], remark: '' };
                    }),
                };
            }
            // For scalar values: just overwrite
            return { ...p, value: newValue };
        }

        return {
            ...p,
            value: updateRecursive(Array.isArray(p.value) ? p.value : [], rest, newValue),
        };
    });
};

// Recursively find all items that have a "binding" field
const findBindings = (items: any[], path: string[] = []): { path: string[]; binding: string }[] => {
    if (!Array.isArray(items)) return [];
    const found: { path: string[]; binding: string }[] = [];
    for (const item of items) {
        if (item.binding) found.push({ path: [...path, item.key], binding: item.binding });
        if (Array.isArray(item.value)) found.push(...findBindings(item.value, [...path, item.key]));
    }
    return found;
};

Deno.serve(async (_req) => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    try {
        // --- Date Context (GMT+8) ---
        const nowUtc = new Date();
        const gmt8Offset = 8 * 60 * 60 * 1000;
        const nowGmt8 = new Date(nowUtc.getTime() + gmt8Offset);
        const today = nowGmt8.toISOString().split('T')[0];
        const yesterdayGmt8 = new Date(nowGmt8.getTime() - 86400000);
        const yesterday = yesterdayGmt8.toISOString().split('T')[0];

        console.log(`[auto-generate-coordination] ${yesterday} -> ${today}`);

        // 1. Fetch yesterday's board — fallback to most recent board if not found
        let prevBoard: any = null;
        let fetchError: any = null;

        // Try yesterday first
        ({ data: prevBoard, error: fetchError } = await supabase
            .from('daily_coordination')
            .select('*')
            .eq('date', yesterday)
            .maybeSingle());

        if (fetchError) throw fetchError;

        // Fallback: use the most recent board available
        if (!prevBoard) {
            console.warn(`No board found for ${yesterday}, falling back to most recent board.`);
            ({ data: prevBoard, error: fetchError } = await supabase
                .from('daily_coordination')
                .select('*')
                .lt('date', today)
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle());
            if (fetchError) throw fetchError;
        }

        if (!prevBoard) {
            const msg = `No source board found at all. Please create the first board manually.`;
            console.warn(msg);
            return new Response(JSON.stringify({ message: msg }), { status: 200 });
        }

        console.log(`Using board from ${prevBoard.date} as template.`);

        let currentParams = prevBoard.parameters;

        // 2. Find all bound RPCs
        const bindings = findBindings(currentParams);
        console.log(`Found ${bindings.length} binding(s) to refresh.`);

        // 3. Execute each RPC and merge the result
        for (const b of bindings) {
            console.log(`Running: ${b.binding}`);
            const { data: result, error: rpcError } = await supabase.rpc(b.binding, { p_date: today });

            if (rpcError) {
                console.error(`RPC error [${b.binding}]:`, rpcError.message);
                continue;
            }
            if (result !== null && result !== undefined) {
                currentParams = updateRecursive(currentParams, b.path, result);
            }
        }

        // 4. Upsert today's board
        const { error: upsertError } = await supabase
            .from('daily_coordination')
            .upsert({ date: today, parameters: currentParams }, { onConflict: 'date' });

        if (upsertError) throw upsertError;

        console.log(`Board for ${today} saved successfully.`);

        // 5. Send Telegram Notification via the existing telegram-notification Edge Function
        try {
            const message =
                `🚀 *Daily Coordination Board Ready!*\n` +
                `📅 Tanggal: *${today}*\n` +
                `📊 Metrics Refreshed: *${bindings.length}*\n\n` +
                `_Board telah berhasil dibuat dan data terbaru telah dimuat._`;

            const tgResponse = await fetch(
                `${supabaseUrl}/functions/v1/telegram-notification`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Required to call another Supabase Edge Function
                        'Authorization': `Bearer ${serviceRoleKey}`,
                    },
                    body: JSON.stringify({
                        text: message,
                        parse_mode: 'Markdown',
                    }),
                }
            );

            const tgBody = await tgResponse.json();
            if (tgResponse.ok) {
                console.log('Telegram notification sent successfully.');
            } else {
                console.error('Telegram notification failed:', tgBody);
            }
        } catch (tgErr: any) {
            // Don't fail the whole job if Telegram is down
            console.error('Telegram fetch error:', tgErr.message);
        }

        return new Response(
            JSON.stringify({ message: `Board for ${today} generated successfully.`, refreshed: bindings.length }),
            { headers: { 'Content-Type': 'application/json' } }
        );

    } catch (err: any) {
        console.error('Fatal error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
