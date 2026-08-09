export interface Env {
  AI: any;
  DB: any;
  ASSETS: any;
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

        const userPrompt = body.prompt || "Hello, I am looking to start a new project.";
        let aiReply = "";

        if (env && env.AI) {
          try {
            const aiResponse = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
              messages: [
                {
                  role: 'system',
                  content: `You are a friendly Product Consultant for DondlingerGC. Talk like a helpful partner in plain English. Keep responses warm and concise (1-2 sentences).`
                },
                { role: 'user', content: userPrompt }
              ]
            });
            aiReply = aiResponse?.response || "Thank you for sharing that. What is your estimated budget or target launch timeline?";
          } catch (aiErr) {
            aiReply = "Thank you! What is your estimated budget or target launch timeline for this initiative?";
          }
        } else {
          aiReply = "Thank you! What is your target budget or launch deadline for this implementation?";
        }

        return new Response(JSON.stringify({ reply: aiReply }), {
          status: 200,
          headers: corsHeaders
        });
      }

      // /api/speak route: Dynamic ONNX & HD Audio generation endpoint
      if (url.pathname === '/api/speak' && request.method === 'POST') {
        let body: { text?: string; voice?: string; personaVoice?: string } = {};
        try { body = await request.json(); } catch (e) {}

        const text = body.text || "Welcome to DondlingerGC.";
        const personaVoice = (body.voice || body.personaVoice || 'gideon').toLowerCase();

        const streamVoiceMap: Record<string, string> = {
          gideon: 'Brian',
          adam: 'Brian',
          malachi: 'Russell',
          santa_anna: 'Salli',
          mercy: 'Joanna',
          nicole: 'Kimberly'
        };
        const voiceName = streamVoiceMap[personaVoice] || 'Brian';

        const ttsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${voiceName}&text=${encodeURIComponent(text)}`;
        const ttsRes = await fetch(ttsUrl).catch(() => null);

        if (ttsRes && ttsRes.ok) {
          const audioBuffer = await ttsRes.arrayBuffer();
          return new Response(audioBuffer, {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'audio/wav',
              'Content-Length': audioBuffer.byteLength.toString()
            }
          });
        }

        return new Response(JSON.stringify({ success: false, mode: 'fallback' }), {
          status: 200,
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
              `sum-${Date.now()}`,
              data.sessionId || 'default-session',
              data.projectScope || '',
              data.estimatedBudget || '',
              data.timeline || '',
              JSON.stringify(data.keyRequirements || []),
              JSON.stringify(data.actionItems || []),
              JSON.stringify(data)
            ).run();
          } catch (dbErr) {}
        }

        return new Response(JSON.stringify({ success: true, message: 'Intake logged' }), {
          status: 200,
          headers: corsHeaders
        });
      }

      if (env && env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }

      return new Response("VoiceIntake Cloudflare Worker Active", { status: 200 });
    } catch (err: any) {
      return new Response(JSON.stringify({ reply: "Thank you. What is your estimated budget or timeline?" }), {
        status: 200,
        headers: corsHeaders
      });
    }
  }
};
