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
                    value: newValue.map((newItem: any) => {
                        const key = typeof newItem === 'string' ? newItem : (newItem.key || newItem.unit_info || newItem.unit_name || newItem.name || 'Unit');
                        const existing = p.value.find((v: any) => v.key === key);
                        return existing ?? { key, value: 'OPEN', steps: [], remark: '' };
                    }),
                };
            }
            // For scalar values: just overwrite
            return { ...p, value: String(newValue) };
        }

        return {
            ...p,
            value: updateRecursive(Array.isArray(p.value) ? p.value : [], rest, newValue),
        };
    });
};

// Carry over logic: preserves manual steps, but filters out sub-parameters if they are marked CLOSED
const carryOverParams = (params: any[]): any[] => {
    if (!Array.isArray(params)) return [];

    return params.map(p => {
        // If it's a category/parent with sub-items in 'value'
        if (Array.isArray(p.value)) {
            return {
                ...p,
                // Filter out items that are CLOSED/CLOSE
                value: carryOverParams(p.value).filter((sub: any) =>
                    !['CLOSED', 'CLOSE'].includes(String(sub.value).toUpperCase())
                )
            };
        }
        // Scalar values: keep everything else (status/remarks/steps)
        return p;
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

Deno.serve(async (req) => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        return new Response(JSON.stringify({ error: 'Config missing' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    try {
        // --- Date Context (GMT+8) ---
        const nowUtc = new Date();
        const gmt8Offset = 8 * 60 * 60 * 1000;
        const nowGmt8 = new Date(nowUtc.getTime() + gmt8Offset);
        const today = nowGmt8.toISOString().split('T')[0];

        console.log(`[Automation] Processing board for ${today}...`);

        // 1. Fetch current board for today
        let { data: currentBoard, error: fetchError } = await supabase
            .from('daily_coordination')
            .select('*')
            .eq('date', today)
            .maybeSingle();

        if (fetchError) throw fetchError;

        // --- STEP 1: AUTO-INITIALIZATION ---
        if (!currentBoard) {
            console.log(`[Step 1] No board found for ${today}. Cloning from latest...`);

            // Get latest board before today
            const { data: latestBoard, error: latestError } = await supabase
                .from('daily_coordination')
                .select('*')
                .lt('date', today)
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (latestError) throw latestError;

            if (!latestBoard) {
                return new Response(JSON.stringify({ error: 'No template/previous board found to clone from.' }), { status: 404 });
            }

            // Carry over ONLY open items + steps
            const newParams = carryOverParams(latestBoard.parameters);

            const { data: createdBoard, error: createError } = await supabase
                .from('daily_coordination')
                .insert([{
                    date: today,
                    parameters: newParams
                }])
                .select()
                .single();

            if (createError) throw createError;
            currentBoard = createdBoard;
            console.log(`[Step 1 Success] Board initialized for ${today}.`);
        }

        let updatedParams = currentBoard.parameters;

        // 2. Find all bound RPCs (Step 2)
        const bindings = findBindings(updatedParams);
        console.log(`Found ${bindings.length} binding(s) to refresh.`);

        // 3. Execute each RPC and merge the result (Step 3)
        let successCount = 0;
        for (const b of bindings) {
            try {
                console.log(`Running: ${b.binding}`);
                const { data: result, error: rpcError } = await supabase.rpc(b.binding, { p_date: today });

                if (rpcError) {
                    console.error(`RPC error [${b.binding}]:`, rpcError.message);
                    continue;
                }

                if (result !== null && result !== undefined) {
                    updatedParams = updateRecursive(updatedParams, b.path, result);
                    successCount++;
                }
            } catch (rpcEx: any) {
                console.error(`Fatal exception running RPC [${b.binding}]:`, rpcEx.message);
            }
        }

        // 4. Update the board with refreshed data
        const { error: updateError } = await supabase
            .from('daily_coordination')
            .update({ parameters: updatedParams })
            .eq('id', currentBoard.id);

        if (updateError) throw updateError;

        console.log(`[Step 3 Success] Board for ${today} refreshed. ${successCount} functions executed.`);

        // STEP 4: TELEGRAM NOTIFICATION (Direct for reliability)
        try {
            const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
            const groupId = Deno.env.get('TELEGRAM_GROUP_ID');
            const threadIdStr = Deno.env.get('THREAD_ID_DAILY_REPORT');
            const threadId = threadIdStr ? parseInt(threadIdStr) : null;

            if (botToken && groupId) {
                console.log(`[Notification] Sending direct to Telegram Group: ${groupId}, Thread: ${threadId}`);

                // Helper to format numbers to Indo style (1.000)
                const formatIndo = (val: any): string => {
                    const numStr = String(val).trim();
                    if (!numStr || isNaN(Number(numStr))) return numStr;
                    // Remove decimals and format with dots
                    const num = Math.floor(Number(numStr));
                    return new Intl.NumberFormat('id-ID').format(num);
                };

                let message = `🚀 *DAILY COORDINATION - ${today}*\n\n`;

                // Helper to extract all key-value pairs (including nested) + steps
                const extractMetrics = (items: any[], depth = 0): string => {
                    if (depth > 2 || !Array.isArray(items)) return '';
                    let text = '';
                    items.forEach(item => {
                        const isArray = Array.isArray(item.value);
                        const emoji = depth === 0 ? '•' : '  └';
                        
                        // Status indicator for items (like OPEN/PROGRESS)
                        const statusVal = String(item.value).toUpperCase();
                        const statusEmoji = statusVal === 'OPEN' ? '🔴' : (statusVal === 'PROGRESS' ? '🟡' : '');

                        if (!isArray) {
                            text += `${emoji} ${statusEmoji} *${item.key}*: ${formatIndo(item.value)}\n`;
                        } else {
                            text += `\n${depth === 0 ? '📊' : '📁'} *${item.key}*\n`;
                            text += extractMetrics(item.value, depth + 1);
                        }

                        // NESTED STEPS: Display right under the item
                        if (Array.isArray(item.steps) && item.steps.length > 0) {
                            item.steps.forEach((s: any) => {
                                const status = String(s.status || '').toUpperCase();
                                const isDone = ['DONE', 'CLOSED'].includes(status);
                                const stepStatus = isDone ? '✅' : '⏳';
                                const indent = depth === 0 ? '     ' : '       ';
                                text += `${indent}${stepStatus} _${s.text}_\n`;
                            });
                        }
                    });
                    return text;
                };

                message += extractMetrics(updatedParams);

                const boardUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '') + '/dashboard/operational/coordination';
                message += `\n🔗 [Open Coordination Board](${boardUrl})`;

                const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: groupId,
                        message_thread_id: (threadId && threadId > 0) ? threadId : undefined,
                        text: message,
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true
                    })
                });

                const result = await response.json();
                if (result.ok) {
                    console.log("[Notification Success]");
                } else {
                    console.error("[Telegram API Error]", result.description);
                }
            } else {
                console.warn("[Notification Skipped] Missing Bot Token or Group ID");
            }
        } catch (teleErr: any) {
            console.error("Failed to send Telegram notification:", teleErr.message);
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Board for ${today} refreshed and notified.`,
            refreshed_count: successCount
        }), { headers: { 'Content-Type': 'application/json' } });

    } catch (err: any) {
        console.error('Execution Error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
