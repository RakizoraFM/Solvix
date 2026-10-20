// fake Supabase REST (rpc) + fake Anthropic Messages API for the solvix-ai test
let take = "ok"; const log: unknown[] = [];
Deno.serve({ port: 9911 }, async (req) => {
  const u = new URL(req.url); const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const J = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
  if (u.pathname === "/ctl") { take = u.searchParams.get("take") || "ok"; return J({ take }); }
  if (u.pathname === "/log") { const l = log.splice(0); return J(l); }
  if (u.pathname === "/rest/v1/rpc/nv_me") return J(req.headers.get("authorization") === "Bearer good" ? { role: "tech" } : null);
  if (u.pathname === "/rest/v1/rpc/nv_ai_take") {
    log.push({ take: body });
    if (take === "ok") return J({ used: 3, limit: 50 });
    return J({ code: "42501", message: take === "limit" ? "ai limit reached" : take === "off" ? "ai disabled" : "Could not find the function public.nv_ai_take(p_kind) in the schema cache" }, take === "nofn" ? 404 : 403);
  }
  if (u.pathname === "/v1/messages") {
    log.push({ anthropic: body, beta: req.headers.get("anthropic-beta"), key: req.headers.get("x-api-key") });
    const fmt = body.output_config?.format;
    const text = fmt ? JSON.stringify({ type_code: "200101010101", manufacturer: "Carrier", brand: "Carrier", model: "42QHC018", capacity: "18000 BTU", serial: "SN-1234", condition_id: "c2", description: "مكيف سبليت جداري", notes: "", confidence: "high" }) : "الإجابة: افتح «الملصقات» من القائمة الجانبية.";
    return J({ id: "msg_1", type: "message", role: "assistant", model: body.model, content: [{ type: "text", text }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } });
  }
  return J({ error: "nf " + u.pathname }, 404);
});
