export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Unit-Id, X-Request-Id, X-Year, X-Month, X-Roster-Type, X-Competency-Id, X-Nrp, X-File-Name, X-Inspection-Id, X-Item-Id, X-Backlog-Id'
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: cors })
    }

    if (env.MAINTENANCE_MODE === 'true') {
      return new Response('Service unavailable', { status: 503, headers: cors })
    }

    const url = new URL(req.url)

    // ===============================
    // HEALTH CHECK
    // ===============================
    if (req.method === 'GET' && url.pathname === '/_health') {
      // Assuming FFF_DB is bound for other tasks, keep it.
      // If only using R2, this might fail if DB isn't bound, but keeping original logic.
      try {
        const r = await env.FFF_DB.prepare('SELECT 1').run()
        return Response.json({ ok: true, db: 'connected' })
      } catch (e) {
        return Response.json({ ok: true, db: 'disconnected' })
      }
    }

    // ===============================
    // SERVE IMAGES (GET)
    // ===============================
    if (req.method === 'GET' && url.pathname.startsWith('/images/filter-replacement/')) {
        const key = url.pathname.replace('/images/filter-replacement/', '')
        
        try {
            const object = await env.R2_FILTER_REPLACEMENT.get(key)
            if (!object) return res(404, 'Image not found', cors)

            const headers = new Headers(cors)
            object.writeHttpMetadata(headers)
            headers.set('etag', object.httpEtag)

            return new Response(object.body, { headers })
        } catch(e) {
            return res(500, e.message, cors)
        }
    }

    if (req.method === 'GET' && url.pathname.startsWith('/images/rosters/')) {
        const key = url.pathname.replace('/images/rosters/', '')
        
        try {
            const object = await env.ROSTER_IMAGES.get(key)
            if (!object) return res(404, 'Roster not found', cors)

            const headers = new Headers(cors)
            object.writeHttpMetadata(headers)
            headers.set('etag', object.httpEtag)

            return new Response(object.body, { headers })
        } catch(e) {
            return res(500, e.message, cors)
        }
    }

    if (req.method === 'GET' && url.pathname.startsWith('/documents/competency/')) {
        const key = url.pathname.replace('/documents/competency/', '')
        
        try {
            const object = await env.R2_COMPETENCY_DOCUMENT.get(key)
            if (!object) return res(404, 'Document not found', cors)

            const headers = new Headers(cors)
            object.writeHttpMetadata(headers)
            headers.set('etag', object.httpEtag)

            return new Response(object.body, { headers })
        } catch(e) {
            return res(500, e.message, cors)
        }
    }

    if (req.method === 'GET' && url.pathname.startsWith('/images/infra-inspection/')) {
        const key = url.pathname.replace('/images/infra-inspection/', '')
        try {
            const object = await env.R2_INFRA_INSPECTION.get(key)
            if (!object) return res(404, 'Image not found', cors)

            const headers = new Headers(cors)
            object.writeHttpMetadata(headers)
            headers.set('etag', object.httpEtag)
            return new Response(object.body, { headers })
        } catch(e) {
            return res(500, e.message, cors)
        }
    }

    // ===============================
    // FILTER REPLACEMENT IMAGE UPLOAD (R2)
    // ===============================
    if (req.method === 'PUT' && url.pathname === '/upload/filter-replacement') {
       // --- JWT ---
       const token = req.headers.get('Authorization')?.split(' ')[1]
       if (!token) return res(401, 'Unauthorized', cors)
 
       try {
         // Verify JWT (ensure user is authenticated)
         await verifyJWT(token, env.SUPABASE_JWT_SECRET)
       } catch {
         return res(401, 'Unauthorized', cors)
       }

       const unitId = req.headers.get('X-Unit-Id')
       const requestId = req.headers.get('X-Request-Id')

       if (!unitId || !requestId) {
         return res(400, 'Missing X-Unit-Id or X-Request-Id headers', cors)
       }

       // Construct Path: YYYY/MM/UNIT_ID/REQUEST_ID
       const now = new Date()
       const year = now.getFullYear()
       const month = String(now.getMonth() + 1).padStart(2, '0')
       
       // File extension handling (optional, default to jpg if unknown or take from content-type)
       // For now, assuming standard image upload, we can append .jpg or keep as is.
       // User requested: YYYY/MM/WWWWW/XXXXX (implied filename is XXXXX or similar)
       // Let's make the key: YYYY/MM/UNIT_ID/REQUEST_ID.jpg to be safe and viewable
       const key = `${year}/${month}/${unitId}/${requestId}.jpg`

       try {
         await env.R2_FILTER_REPLACEMENT.put(key, req.body)
         
         // Return the public URL (assuming it's public or custom domain)
         // If bucket is public via domain, construct URL. 
         // For now, returning the Key so app can construct or store it.
         // If env.PUBLIC_R2_DOMAIN is set, return full URL.
         const publicUrl = env.PUBLIC_R2_DOMAIN 
            ? `${env.PUBLIC_R2_DOMAIN}/${key}` 
            : key // Fallback to key if domain not configured

         return Response.json({ status: 'ok', key, url: publicUrl }, { headers: cors })
       } catch (e) {
         return res(500, `Upload failed: ${e.message}`, cors)
       }
    }

    // ===============================
    // COMPETENCY DOCUMENT UPLOAD (R2)
    // ===============================
    if (req.method === 'PUT' && url.pathname === '/upload/competency-document') {
       const token = req.headers.get('Authorization')?.split(' ')[1]
       if (!token) return res(401, 'Unauthorized', cors)
 
       try {
         await verifyJWT(token, env.SUPABASE_JWT_SECRET)
       } catch {
         return res(401, 'Unauthorized', cors)
       }
 
       const compId = req.headers.get('X-Competency-Id')
       const nrp = req.headers.get('X-Nrp')
       const fileName = req.headers.get('X-File-Name') || 'document'
 
       if (!compId || !nrp) {
         return res(400, 'Missing X-Competency-Id or X-Nrp headers', cors)
       }
 
       // Clean fileName: remove special chars, keep extension
       const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
       const timestamp = Date.now()
       const key = `${compId}/${nrp}/${timestamp}_${safeFileName}`
 
       try {
         await env.R2_COMPETENCY_DOCUMENT.put(key, req.body, {
           httpMetadata: { contentType: req.headers.get('Content-Type') || 'application/octet-stream' }
         })
         
         const publicUrl = env.PUBLIC_R2_DOMAIN_COMPETENCY 
            ? `${env.PUBLIC_R2_DOMAIN_COMPETENCY}/${key}` 
            : key 
 
         return Response.json({ status: 'ok', key, url: publicUrl }, { headers: cors })
       } catch (e) {
         return res(500, `Upload failed: ${e.message}`, cors)
       }
     }

    // ===============================
    // INFRA INSPECTION PHOTO UPLOAD (R2)
    // ===============================
    if (req.method === 'PUT' && url.pathname === '/upload/infra-inspection') {
       const token = req.headers.get('Authorization')?.split(' ')[1]
       if (!token) return res(401, 'Unauthorized', cors)

       try {
         await verifyJWT(token, env.SUPABASE_JWT_SECRET)
       } catch {
         return res(401, 'Unauthorized', cors)
       }

       const inspectionId = req.headers.get('X-Inspection-Id')
       const itemId = req.headers.get('X-Item-Id')
       const customFileName = req.headers.get('X-File-Name')

       if (!inspectionId || !itemId) {
         return res(400, 'Missing X-Inspection-Id or X-Item-Id headers', cors)
       }

       const timestamp = Date.now()
       const key = customFileName 
         ? `${inspectionId}/${itemId}/${customFileName}`
         : `${inspectionId}/${itemId}/${timestamp}.jpg`

       try {
         await env.R2_INFRA_INSPECTION.put(key, req.body, {
           httpMetadata: { contentType: req.headers.get('Content-Type') || 'image/jpeg' }
         })

         const publicUrl = env.PUBLIC_R2_DOMAIN_INFRA
            ? `${env.PUBLIC_R2_DOMAIN_INFRA}/${key}`
            : `/images/infra-inspection/${key}`

         return Response.json({ status: 'ok', key, url: publicUrl }, { headers: cors })
       } catch (e) {
         return res(500, `Upload failed: ${e.message}`, cors)
       }
    }

    // ===============================
    // DELETE INFRA INSPECTION PHOTO
    // ===============================
    if (req.method === 'DELETE' && url.pathname === '/upload/infra-inspection') {
        const token = req.headers.get('Authorization')?.split(' ')[1]
        if (!token) return res(401, 'Unauthorized', cors)

        try {
          await verifyJWT(token, env.SUPABASE_JWT_SECRET)
        } catch {
          return res(401, 'Unauthorized', cors)
        }

        const key = url.searchParams.get('key')
        if (!key) return res(400, 'Missing key parameter', cors)

        try {
          await env.R2_INFRA_INSPECTION.delete(key)
          return Response.json({ status: 'ok', msg: 'Deleted' }, { headers: cors })
        } catch (e) {
          return res(500, `Delete failed: ${e.message}`, cors)
        }
    }

    // ===============================
    // INFRA BACKLOG PHOTO UPLOAD (R2)
    // ===============================
    if (req.method === 'PUT' && url.pathname === '/upload/infra-backlog') {
        const token = req.headers.get('Authorization')?.split(' ')[1]
        if (!token) return res(401, 'Unauthorized', cors)

        try {
          await verifyJWT(token, env.SUPABASE_JWT_SECRET)
        } catch {
          return res(401, 'Unauthorized', cors)
        }

        const backlogId = req.headers.get('X-Backlog-Id')
        if (!backlogId) return res(400, 'Missing X-Backlog-Id header', cors)

        const timestamp = Date.now()
        const key = `${backlogId}/${timestamp}.jpg`

        try {
          await env.R2_INFRA_INSPECTION.put(key, req.body, {
            httpMetadata: { contentType: req.headers.get('Content-Type') || 'image/jpeg' }
          })

          const publicUrl = env.PUBLIC_R2_DOMAIN_INFRA
             ? `${env.PUBLIC_R2_DOMAIN_INFRA}/${key}`
             : `/images/infra-inspection/${key}`

          return Response.json({ status: 'ok', key, url: publicUrl }, { headers: cors })
        } catch (e) {
          return res(500, `Upload failed: ${e.message}`, cors)
        }
    }

    // ===============================
    // DELETE INFRA BACKLOG PHOTO
    // ===============================
    if (req.method === 'DELETE' && url.pathname === '/upload/infra-backlog') {
        const token = req.headers.get('Authorization')?.split(' ')[1]
        if (!token) return res(401, 'Unauthorized', cors)

        try {
          await verifyJWT(token, env.SUPABASE_JWT_SECRET)
        } catch {
          return res(401, 'Unauthorized', cors)
        }

        const key = url.searchParams.get('key')
        if (!key) return res(400, 'Missing key parameter', cors)

        try {
          await env.R2_INFRA_INSPECTION.delete(key)
          return Response.json({ status: 'ok', msg: 'Deleted' }, { headers: cors })
        } catch (e) {
          return res(500, `Delete failed: ${e.message}`, cors)
        }
    }


    // ===============================
    // BATCH INSERT ENDPOINT (Original)
    // ===============================
    if (req.method === 'POST' && url.pathname === '/fuel/batch-insert') {

      // --- JWT ---
      const token = req.headers.get('Authorization')?.split(' ')[1]
      if (!token) return res(401, 'Unauthorized', cors)

      let payload
      try {
        payload = await verifyJWT(token, env.SUPABASE_JWT_SECRET)
        if (payload.role !== 'admin') {
          return res(403, 'Forbidden', cors)
        }
      } catch {
        return res(401, 'Unauthorized', cors)
      }

      // --- BODY ---
      let body
      try {
        body = await req.json()
      } catch {
        return res(400, 'Invalid JSON', cors)
      }

      const rows = body.rows
      if (!Array.isArray(rows) || rows.length === 0) {
        return res(400, 'rows must be array', cors)
      }

      if (rows.length > 100) {
        return res(400, 'Max 100 rows per request', cors)
      }

      let inserted = 0
      let skipped = 0
      let errors = []

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]

        // --- Minimal validation ---
        if (!r.nd || !r.issued_date || !r.shift || !r.warehouse || !r.cn_unit || !r.qty || !r.nrp_login) {
          errors.push({ row: i + 1, nd: r.nd ?? null, reason: 'missing_required_field' })
          continue
        }

        if (Number(r.qty) <= 0) {
          errors.push({ row: i + 1, nd: r.nd, reason: 'invalid_qty' })
          continue
        }

        try {
          await env.FFF_DB.prepare(`
            INSERT INTO fuel_usage_records (
              nd,
              no_logsheet,
              issued_date,
              shift,
              warehouse,
              cn_unit,
              qty,
              nrp_login
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            r.nd,
            r.no_logsheet ?? null,
            r.issued_date,
            r.shift,
            r.warehouse,
            r.cn_unit,
            r.qty,
            r.nrp_login
          ).run()

          inserted++

        } catch (e) {
          if (String(e).includes('UNIQUE')) {
            skipped++
          } else {
            errors.push({ row: i + 1, nd: r.nd, reason: 'db_error' })
          }
        }
      }

      return Response.json({
        status: errors.length ? 'partial' : 'ok',
        inserted,
        skipped,
        failed: errors.length,
        errors
      }, { headers: cors })
    }

    return res(404, 'Not Found', cors)
  }
}

// ===============================
// Helpers
// ===============================
function res(status, msg, headers) {
  return new Response(msg, { status, headers })
}

// Minimal HS256 JWT verify
async function verifyJWT(token, secret) {
  const [h, p, s] = token.split('.')
  if (!h || !p || !s) throw new Error()

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sig,
    enc.encode(`${h}.${p}`)
  )

  if (!valid) throw new Error()
  return JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')))
}
