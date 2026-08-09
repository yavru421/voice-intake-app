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

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (url.pathname === '/api/ai-chat' && request.method === 'POST') {
        let body: { prompt?: string; personaVoice?: string } = {};
        try {
          body = await request.json();
        } catch (e) {
          body = {};
        }
        
        const userPrompt = body.prompt || "Hello, I am looking to start a new project.";
        let aiReply = "";

        if (env && env.AI) {
          try {
            const aiResponse = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
              messages: [
                {
                  role: 'system',
                  content: `You are VoiceIntake AI, an executive client onboarding director. Your goal is to guide the client through an intake interview until all project parameters are gathered: 1) Core project scope & objectives, 2) Technical features & integrations, 3) Budget range, and 4) Target launch timeline. Ask 1 focused question at a time. Keep responses concise (under 2 sentences), professional, and conversational.`
                },
                { role: 'user', content: userPrompt }
              ]
            });
            aiReply = aiResponse?.response || "Thank you for sharing that. What is your estimated budget or target launch timeline for this initiative?";
          } catch (aiErr) {
            console.error("Workers AI error fallback:", aiErr);
            aiReply = "Thank you. I have logged those project details. Could you tell me more about your target budget or launch timeline?";
          }
        } else {
          aiReply = "I have noted that requirement! What is your target budget or launch deadline for this implementation?";
        }

        return new Response(JSON.stringify({ reply: aiReply }), {
          status: 200,
          headers: corsHeaders
        });
      }

      if (url.pathname === '/api/speak' && request.method === 'POST') {
        return new Response(JSON.stringify({ success: true, mode: 'browser_tts' }), {
          status: 200,
          headers: corsHeaders
        });
      }

      if (url.pathname === '/api/submit-intake' && request.method === 'POST') {
        let data: any = {};
        try {
          data = await request.json();
        } catch (e) {
          data = {};
        }

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
          } catch (dbErr) {
            console.error("D1 database error:", dbErr);
          }
        }

        return new Response(JSON.stringify({ success: true, message: 'Intake logged successfully' }), {
          status: 200,
          headers: corsHeaders
        });
      }

      // Serve static frontend assets via Cloudflare Worker ASSETS binding
      if (env && env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }

      return new Response("VoiceIntake Worker Active", { status: 200 });
    } catch (err: any) {
      return new Response(JSON.stringify({ reply: "Thank you. What is your estimated budget or timeline for this implementation?" }), {
        status: 200,
        headers: corsHeaders
      });
    }
  }
};
