export interface Env {
  AI: any;
  DB: any;
  ASSETS: any;
  VOICEMAIL_BUCKET: any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (url.pathname === '/api/ai-chat' && request.method === 'POST') {
        let body: { prompt?: string; personaVoice?: string } = {};
        try { body = await request.json(); } catch (e) {}

        const userPrompt = (body.prompt || "Hello, I am looking to get a contracting project estimated.").trim();
        const personaVoice = (body.personaVoice || 'gideon').toLowerCase();
        
        // Normalize prompt for caching (lowercase, strip punctuation)
        const promptNorm = userPrompt.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
        const cacheKey = `${personaVoice}:${promptNorm}`;

        // 1. Check D1 Database response cache if binding exists
        if (env && env.DB && promptNorm.length > 0) {
          try {
            const cached: any = await env.DB.prepare(
              `SELECT response_text FROM voice_response_cache WHERE prompt_norm = ? AND persona_voice = ? LIMIT 1`
            ).bind(promptNorm, personaVoice).first();

            if (cached && cached.response_text) {
              // Async hit count update
              env.DB.prepare(
                `UPDATE voice_response_cache SET hit_count = hit_count + 1, updated_at = CURRENT_TIMESTAMP WHERE prompt_norm = ? AND persona_voice = ?`
              ).bind(promptNorm, personaVoice).run().catch(() => {});

              return new Response(JSON.stringify({ reply: cached.response_text, cached: true }), {
                status: 200,
                headers: corsHeaders
              });
            }
          } catch (cacheErr) {
            console.warn('D1 cache read error:', cacheErr);
          }
        }

        let aiReply = "";

        const systemPrompt = `You are an AI Intake Specialist for Dondlinger General Contracting.
Your job is to collect structured project data from potential clients in plain English for residential, commercial, concrete, roofing, or land development projects.

STRICT RULES:
1. Single-Topic Prompting: Ask only ONE question at a time to keep conversation simple and clear.
2. Structured Intake Goals: Gather client name, contact info, site address, project scope, target timeline, and budget expectation.
3. ABSOLUTELY NO SPECULATIVE OR BINDING QUOTES: Never give formal price estimates or cost commitments during intake. State that a Dondlinger GC field inspector will perform an on-site evaluation for formal scoping.
4. Keep responses under 2 sentences. Warm, direct, professional.`;

        if (env && env.AI) {
          try {
            const aiResponse = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ]
            });
            aiReply = aiResponse?.response || "Thank you for describing that. What is the street address or location for this project?";
          } catch (aiErr) {
            aiReply = "Thank you! What is the site address or project location so our field team can evaluate it?";
          }
        } else {
          aiReply = "Thank you! What is the site address or location of your project?";
        }

        // Store generated response into D1 voice_response_cache
        if (env && env.DB && promptNorm.length > 0 && aiReply) {
          try {
            await env.DB.prepare(`
              INSERT INTO voice_response_cache (prompt_hash, prompt_norm, response_text, persona_voice)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(prompt_hash) DO UPDATE SET response_text = excluded.response_text, hit_count = hit_count + 1, updated_at = CURRENT_TIMESTAMP
            `).bind(
              `${cacheKey}-${Date.now()}`,
              promptNorm,
              aiReply,
              personaVoice
            ).run();
          } catch (dbSaveErr) {
            console.warn('D1 cache insert error:', dbSaveErr);
          }
        }

        return new Response(JSON.stringify({ reply: aiReply, cached: false }), {
          status: 200,
          headers: corsHeaders
        });
      }

      // /api/speak route: Delegates directly to speech-webmcp-server
      if (url.pathname === '/api/speak' && request.method === 'POST') {
        let body: { text?: string; voice?: string; personaVoice?: string; persona?: string } = {};
        try { body = await request.json(); } catch (e) {}

        const webMcpUrl = 'https://speech-webmcp.dondlingergc.com/api/speak';
        const mcpRes = await fetch(webMcpUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }).catch(() => null);

        if (mcpRes && mcpRes.ok) {
          const audioBuffer = await mcpRes.arrayBuffer();
          return new Response(audioBuffer, {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'audio/mp3',
              'Content-Length': audioBuffer.byteLength.toString()
            }
          });
        }

        return new Response(JSON.stringify({ success: false, mode: 'fallback' }), {
          status: 502,
          headers: corsHeaders
        });
      }

      if (url.pathname === '/api/submit-intake' && request.method === 'POST') {
        let data: any = {};
        try { data = await request.json(); } catch (e) {}

        if (env && env.DB) {
          try {
            await env.DB.prepare(`
              INSERT INTO intake_summaries (id, session_id, project_scope, estimated_budget, timeline, key_requirements, action_items, raw_json)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              `gc-${Date.now()}`,
              data.sessionId || 'gc-session',
              data.projectScope || '',
              data.estimatedBudget || '',
              data.timeline || '',
              JSON.stringify(data.keyRequirements || []),
              JSON.stringify(data.actionItems || []),
              JSON.stringify(data)
            ).run();
          } catch (dbErr) {}
        }

        return new Response(JSON.stringify({ success: true, message: 'General Contracting Intake logged successfully' }), {
          status: 200,
          headers: corsHeaders
        });
      }

      if (url.pathname === '/api/voicemail' && request.method === 'POST') {
        try {
          if (!env.VOICEMAIL_BUCKET) {
            return new Response(JSON.stringify({ success: false, error: 'VOICEMAIL_BUCKET not bound' }), { status: 500, headers: corsHeaders });
          }
          const formData = await request.formData();
          const audioFile = formData.get('audio') as File;
          const sessionId = formData.get('sessionId') || 'unknown-session';

          if (!audioFile) {
            return new Response(JSON.stringify({ success: false, error: 'No audio provided' }), { status: 400, headers: corsHeaders });
          }

          const fileKey = `gc-vm-${sessionId}-${Date.now()}.webm`;
          await env.VOICEMAIL_BUCKET.put(fileKey, await audioFile.arrayBuffer(), {
            httpMetadata: { contentType: audioFile.type || 'audio/webm' }
          });

          return new Response(JSON.stringify({ success: true, fileKey, message: 'Voicemail saved securely to R2 bucket.' }), {
            status: 200,
            headers: corsHeaders
          });
        } catch (vmErr: any) {
          return new Response(JSON.stringify({ success: false, error: vmErr.message }), { status: 500, headers: corsHeaders });
        }
      }

      if (env && env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }

      return new Response("DondlingerGC VoiceIntake Cloudflare Worker Active", { status: 200 });
    } catch (err: any) {
      return new Response(JSON.stringify({ reply: "Thank you. What is the site address or project location?" }), {
        status: 200,
        headers: corsHeaders
      });
    }
  }
};
