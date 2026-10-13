// Solvix — «solvix-mail» Edge Function (NV18).
// Sends the school report (Excel with the data, asset photos and QR codes) when a field supervisor finishes a school,
// and a test message from «الإعدادات». The caller is checked with nv_me(); the recipients are decided HERE, never by the page:
// the supervisor's own e-mail + «بريد المستلمين» (nv_settings.data.admin_email). Mail goes out through Resend (https://resend.com).
// Secrets (Supabase → Edge Functions → Secrets): RESEND_API_KEY, MAIL_FROM (e.g. "Solvix <reports@your-domain.com>").
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const isMail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) && !s.endsWith("@novaro.local");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const key = Deno.env.get("RESEND_API_KEY"), from = Deno.env.get("MAIL_FROM");
    if (!key || !from) return json({ error: "RESEND_API_KEY / MAIL_FROM are not set" }, 500);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });
    const { data: me, error: meErr } = await sb.rpc("nv_me");
    if (meErr || !me || !me.role) return json({ error: "not allowed" }, 403);
    const body = await req.json().catch(() => ({}));
    const { data: st } = await sb.from("nv_settings").select("data").eq("id", 1).maybeSingle();
    const cfg = (st && st.data) || {};
    const app = cfg.app_name || "Solvix";
    let to: string[] = String(cfg.admin_email || "").split(/[,;\s]+/).map((x: string) => x.trim().toLowerCase()).filter(isMail);
    let subject = "", html = "";
    let attachments: { filename: string; content: string }[] | undefined;

    if (body.kind === "test") {
      if (me.role !== "admin") return json({ error: "not allowed" }, 403);
      const { data: u } = await sb.auth.getUser();
      const em = (u?.user?.email || "").toLowerCase();
      if (isMail(em)) to.push(em);
      subject = `${app} — رسالة تجريبية`;
      html = `<div dir="rtl" style="font-family:Tahoma,Arial">تم ضبط إرسال البريد في ${esc(app)} بنجاح ✅<br>تصل تقارير المدارس إلى: ${esc(to.join("، "))}</div>`;
    } else if (body.kind === "school") {
      const { data: s } = await sb.from("nv_schools").select("id,name,moe,ident,city,district,completed_at,completed_by").eq("id", body.school_id).maybeSingle();
      if (!s) return json({ error: "school not found" }, 404);
      if (!s.completed_at) return json({ error: "school not completed" }, 409);
      if (me.role === "tech" && s.completed_by !== me.emp?.id) return json({ error: "not your school" }, 403);
      if (me.role !== "tech" && me.role !== "admin") return json({ error: "not allowed" }, 403);
      const empId = me.role === "tech" ? me.emp.id : (body.emp_id || s.completed_by);
      const { data: emp } = await sb.from("nv_employees").select("name,number,email").eq("id", empId).maybeSingle();
      if (emp?.email && isMail(String(emp.email).toLowerCase())) to.push(String(emp.email).toLowerCase());
      const b64 = String(body.file_b64 || "");
      if (!b64 || b64.length > 34_000_000) return json({ error: "file missing or larger than 25 MB" }, 413);
      const fname = String(body.filename || "report.xlsx").replace(/[\\/:*?"<>|\r\n]/g, "-").slice(0, 120);
      subject = `${app} — اكتمل جرد ${s.name}`;
      html = `<div dir="rtl" style="font-family:Tahoma,Arial;line-height:1.8">
        <h3 style="margin:0 0 8px">اكتمل جرد مدرسة: ${esc(s.name)}</h3>
        <div>الرقم الوزاري: ${esc(s.moe)} · المعرّف: ${esc(s.ident)} · ${esc(s.city)} ${esc(s.district)}</div>
        <div>مشرف الميدان: ${esc(emp?.name)} (${esc(emp?.number)})</div>
        <div>عدد الأصول: ${esc(body.count)} · إجمالي الكمية: ${esc(body.qty)}</div>
        <div>تاريخ الإنهاء: ${esc(new Date(s.completed_at).toLocaleString("ar-SA-u-ca-gregory", { timeZone: "Asia/Riyadh" }))}</div>
        <p>مرفق ملف Excel: ورقة «البيانات» وورقة «صور الأصول» (صورة كل أصل ورمز QR ورقمه).</p></div>`;
      attachments = [{ filename: fname, content: b64 }];
    } else return json({ error: "unknown kind" }, 400);

    to = [...new Set(to)];
    if (!to.length) return json({ error: "no recipients: add «بريد المستلمين» in the settings or the supervisor's e-mail" }, 422);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, attachments }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: out?.message || "send failed" }, 502);
    return json({ ok: true, to, id: out.id });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
