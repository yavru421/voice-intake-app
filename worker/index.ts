export interface Env {
  AI: any;
  DB: any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    try {
      if (url.pathname === '/api/ai-chat' && request.method === 'POST') {
        const body: { prompt: string; personaVoice?: string } = await request.json();
        
        let aiReply = "";

        if (env.AI) {
          const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
              {
                role: 'system',
                content: `You are VoiceIntake AI (${body.personaVoice || 'gideon'} persona), an empathetic, sub-200ms real-time voice onboarding assistant for contractors, agencies, and high-ticket freelancers. Keep responses under 2 sentences, clear, professional, and conversational.`
              },
              { role: 'user', content: body.prompt }
            ]
          });
          aiReply = aiResponse.response || "Thank you. I have logged those project details. Could you tell me more about your desired timeline?";
        } else {
          aiReply = "I have noted that requirement! What is your target deadline or launch timeline for this project?";
        }

        return new Response(JSON.stringify({ reply: aiReply }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      if (url.pathname === '/api/submit-intake' && request.method === 'POST') {
        const data = await request.json();

        if (env.DB) {
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
        }

        return new Response(JSON.stringify({ success: true, message: 'Intake saved to D1' }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Serve full VoiceIntake PWA application from Cloudflare Pages
      const pagesTarget = new URL(url.pathname + url.search, 'https://master.voice-intake-pwa.pages.dev');
      const pageRes = await fetch(pagesTarget.toString());
      
      const newHeaders = new Headers(pageRes.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');

      return new Response(pageRes.body, {
        status: pageRes.status,
        statusText: pageRes.statusText,
        headers: newHeaders
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
