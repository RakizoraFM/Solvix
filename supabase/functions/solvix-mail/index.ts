// Solvix — «solvix-mail» Edge Function (NV18).
// Sends the school report (Excel with the data, asset photos and QR codes) when a field supervisor finishes a school,
// and a test message from «الإعدادات». The caller is checked with nv_me(); the recipients are decided HERE, never by the page:
// the supervisor's own e-mail + «بريد المستلمين» (nv_settings.data.admin_email). Mail goes out through Resend (https://resend.com).
// Secrets (Supabase → Edge Functions → Secrets): RESEND_API_KEY, MAIL_FROM (e.g. "Solvix <reports@your-domain.com>"), CRON_SECRET (optional, NV29).
// NV29: kind "sub_reminder" (subscription ends in 14 / 7 / 1 days, or ended: to the owners, copy to the system Admins; once per stage — decided
// by nv_sub_reminder_due() with the service role) and kind "renew_request" (the owner asks for a renewal: to the system Admins).
// "sub_reminder" may be called by a signed-in member (the platform calls it once a day) or by pg_cron with the header x-cron-secret = CRON_SECRET.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
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
    const body = await req.json().catch(() => ({}));
    const cron = !!Deno.env.get("CRON_SECRET") && req.headers.get("x-cron-secret") === Deno.env.get("CRON_SECRET");
    const { data: me0, error: meErr } = cron ? { data: null, error: null } : await sb.rpc("nv_me");
    const me = me0 as any;
    if (!cron && (meErr || !me || !me.role)) return json({ error: "not allowed" }, 403);
    if (cron && body.kind !== "sub_reminder") return json({ error: "not allowed" }, 403);
    // service-role client (the key lives only in the Edge Function environment, never in a page)
    const adm = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const fmtD = (x: string) => new Date(x).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Riyadh" });
    const send = async (to: string[], cc: string[], subject: string, html: string) => {
      const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, ...(cc.length ? { cc } : {}), subject, html }) });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(out?.message || "send failed");
      return out.id;
    };
    if (body.kind === "sub_reminder") {
      const a = adm();
      const { data: due, error } = await a.rpc("nv_sub_reminder_due");
      if (error) return json({ error: error.message }, 500);
      if (!due) return json({ ok: true, sent: false });
      const to = ((due.to || []) as string[]).filter(isMail), cc = ((due.cc || []) as string[]).filter(isMail).filter((x) => !to.includes(x));
      if (!to.length && !cc.length) return json({ ok: true, sent: false, reason: "no recipients" });
      const { data: st0 } = await a.from("nv_settings").select("data").eq("id", 1).maybeSingle();
      const app0 = (st0?.data?.app_name) || "Solvix";
      const end = fmtD(due.ends_at), stage = Number(due.stage);
      const subject = stage === 0 ? `${app0} — انتهى الاشتراك` : `${app0} — ينتهي الاشتراك خلال ${stage === 1 ? "يوم واحد" : stage + " أيام"}`;
      const html = `<div dir="rtl" style="font-family:Tahoma,Arial;line-height:1.9">
        <h3 style="margin:0 0 8px">${stage === 0 ? "انتهى اشتراك " + esc(app0) : "تذكير بموعد انتهاء اشتراك " + esc(app0)}</h3>
        <div>الجهة: ${esc(due.customer || "—")}</div><div>تاريخ الانتهاء: <b>${esc(end)}</b></div>
        ${stage === 0 ? `<p>يعمل النظام الآن في فترة السماح (${esc(due.grace_days)} أيام)، ثم يصبح <b>للقراءة فقط</b>: يبقى العرض والتصدير متاحين ولا يُحذف أي شيء، ويتوقف الجرد والتعديل حتى التجديد.</p>`
          : `<p>متبقٍ <b>${esc(due.days)}</b> ${Number(due.days) === 1 ? "يوم" : "أيام"}. بعد الانتهاء وفترة السماح يصبح النظام للقراءة فقط حتى التجديد.</p>`}
        <p>للتجديد: من ${esc(app0)} ← الإعدادات العامة ← «طلب تجديد»، أو تواصل مع مزوّد الخدمة.</p></div>`;
      const { data: claimed, error: claimError } = await a.rpc("nv_sub_reminder_claim", { p_stage: stage, p_ends_at: due.ends_at });
      if (claimError) return json({ error: claimError.message }, 500);
      if (!claimed) return json({ ok: true, sent: false });
      const id = await send(to.length ? to : cc, to.length ? cc : [], subject, html);
      const { error: markError } = await a.rpc("nv_sub_reminder_mark", { p_stage: stage, p_ends_at: due.ends_at, p_to: to.concat(cc) });
      if (markError) return json({ error: markError.message }, 500);
      return json({ ok: true, sent: true, stage, to, cc, id });
    }
    if (body.kind === "renew_request") {
      const { data: rq, error } = await sb.rpc("nv_renew_request", { p_note: String(body.note || "").slice(0, 1000) });
      if (error) return json({ error: error.message }, 409);
      const { data: admins } = await adm().rpc("nv_sys_emails");
      const to = ((admins || []) as string[]).filter(isMail);
      if (!to.length) return json({ error: "no Admin e-mail" }, 422);
      const u = rq.usage || {}, L = (k: string, l: string) => `<tr><td>${l}</td><td>${esc(u[k])}</td><td>${rq["max_" + k] ?? "بلا حد"}</td></tr>`;
      const html = `<div dir="rtl" style="font-family:Tahoma,Arial;line-height:1.9">
        <h3 style="margin:0 0 8px">طلب تجديد اشتراك</h3>
        <div>الجهة: <b>${esc(rq.customer || "—")}</b> · الباقة: ${esc(rq.plan)}</div>
        <div>مقدّم الطلب: ${esc(rq.name)} (${esc(rq.by)})</div>
        <div>تاريخ الانتهاء الحالي: ${rq.ends_at ? esc(fmtD(rq.ends_at)) : "—"} ${rq.ok ? "" : "· <b style='color:#b91c1c'>منتهٍ (قراءة فقط)</b>"}</div>
        ${rq.note ? `<p style="background:#f1f5f9;padding:8px 12px;border-radius:8px">${esc(rq.note)}</p>` : ""}
        <table cellpadding="6" style="border-collapse:collapse;border:1px solid #e2e8f0"><tr style="background:#f8fafc"><th>البند</th><th>المستخدم</th><th>الحد</th></tr>
        ${L("schools", "المباني")}${L("field", "مشرفو الميدان")}${L("staff", "حسابات الإدارة")}${L("assets", "الأصول")}</table>
        <p>جدّد من «الإعدادات ← إدارة النظام (Admin)».</p></div>`;
      const id = await send(to, [], `Solvix — طلب تجديد من ${rq.customer || rq.by}`, html);
      return json({ ok: true, to, id });
    }
    const { data: st } = await adm().from("nv_settings").select("data").eq("id", 1).maybeSingle();
    const cfg = (st && st.data) || {};
    const app = cfg.app_name || "Solvix";
    let to: string[] = String(cfg.admin_email || "").split(/[,;\s]+/).map((x: string) => x.trim().toLowerCase()).filter(isMail);
    let subject = "", html = "";
    let attachments: { filename: string; content: string }[] | undefined;

    if (body.kind === "test") {
      if (!me.sys && !(me.perms || []).includes("settings")) return json({ error: "not allowed" }, 403);
      const { data: u } = await sb.auth.getUser();
      const em = (u?.user?.email || "").toLowerCase();
      if (isMail(em)) to.push(em);
      subject = `${app} — رسالة تجريبية`;
      html = `<div dir="rtl" style="font-family:Tahoma,Arial">تم ضبط إرسال البريد في ${esc(app)} بنجاح ✅<br>تصل تقارير المباني إلى: ${esc(to.join("، "))}</div>`;
    } else if (body.kind === "school") {
      const { data: s } = await sb.from("nv_schools").select("id,name,moe,ident,city,district,completed_at,completed_by").eq("id", body.school_id).maybeSingle();
      if (!s) return json({ error: "building not found" }, 404);
      if (!s.completed_at) return json({ error: "building not completed" }, 409);
      if (me.role === "tech" && s.completed_by !== me.emp?.id) return json({ error: "not your building" }, 403);
      if (me.role !== "tech" && me.role !== "admin") return json({ error: "not allowed" }, 403);
      const empId = me.role === "tech" ? me.emp.id : (body.emp_id || s.completed_by);
      const { data: emp } = await sb.from("nv_employees").select("name,number,email").eq("id", empId).maybeSingle();
      if (emp?.email && isMail(String(emp.email).toLowerCase())) to.push(String(emp.email).toLowerCase());
      const b64 = String(body.file_b64 || "");
      if (!b64 || b64.length > 34_000_000) return json({ error: "file missing or larger than 25 MB" }, 413);
      const fname = String(body.filename || "report.xlsx").replace(/[\\/:*?"<>|\r\n]/g, "-").slice(0, 120);
      const { data: totals, error: totalsError } = await sb.rpc("nv_school_report_totals", { p_school: s.id });
      if (totalsError) return json({ error: totalsError.message }, 500);
      const assetCount = totals?.count || 0, assetQty = totals?.qty || 0;
      subject = `${app} — اكتمل جرد ${s.name}`;
      html = `<div dir="rtl" style="font-family:Tahoma,Arial;line-height:1.8">
        <h3 style="margin:0 0 8px">اكتمل جرد مبنى: ${esc(s.name)}</h3>
        <div>رقم المبنى: ${esc(s.moe)} · المعرّف: ${esc(s.ident)} · ${esc(s.city)} ${esc(s.district)}</div>
        <div>مشرف الميدان: ${esc(emp?.name)} (${esc(emp?.number)})</div>
        <div>عدد الأصول: ${esc(assetCount)} · إجمالي الكمية: ${esc(assetQty)}</div>
        <div>تاريخ الإنهاء: ${esc(new Date(s.completed_at).toLocaleString("ar-SA-u-ca-gregory", { timeZone: "Asia/Riyadh" }))}</div>
        <p>مرفق ملف Excel: ورقة «البيانات» وورقة «صور الأصول» (صورة كل أصل ورمز QR ورقمه).</p></div>`;
      attachments = [{ filename: fname, content: b64 }];
    } else return json({ error: "unknown kind" }, 400);

    to = [...new Set(to)];
    if (!to.length) return json({ error: "no recipients: add «بريد المستلمين» in the settings or the supervisor's e-mail" }, 422);
    const { data: claimed, error: claimError } = await sb.rpc("nv_mail_claim", { p_kind: body.kind, p_school: body.kind === "school" ? String(body.school_id) : "" });
    if (claimError) return json({ error: claimError.message }, 403);
    if (!claimed) return json({ error: "Please wait 10 minutes before sending this report again" }, 429);
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
