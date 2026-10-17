// Solvix — «solvix-mail» Edge Function (NV18).
// Sends the school report (Excel with the data, asset photos and QR codes) when a field supervisor finishes a school,
// and a test message from «الإعدادات». The caller is checked with nv_me(); the recipients are decided HERE, never by the page:
// the supervisor's own e-mail + «بريد المستلمين» (nv_settings.data.admin_email). Mail goes out through Resend (https://resend.com).
// Secrets (Supabase → Edge Functions → Secrets): RESEND_API_KEY, MAIL_FROM (e.g. "Solvix <reports@your-domain.com>"), CRON_SECRET (optional, NV29).
// NV29: kind "sub_reminder" (subscription ends in 14 / 7 / 1 days, or ended: to the owners, copy to the system Admins; once per stage — decided
// by nv_sub_reminder_due() with the service role) and kind "renew_request" (the owner asks for a renewal: to the system Admins).
// "sub_reminder" may be called by a signed-in member (the platform calls it once a day) or by pg_cron with the header x-cron-secret = CRON_SECRET.
// NV34: customers — reminders go out for every customer whose subscription is due (to its owners + its official e-mail and CC list, copy to
// the Admins); kind "tenant_welcome" (system Admin only) mails a new customer its sign-in link, e-mail + password, subscription and limits.
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
      const { data: due0, error } = await a.rpc("nv_sub_reminder_due");
      if (error) return json({ error: error.message }, 500);
      const dues = (Array.isArray(due0) ? due0 : due0 ? [due0] : []) as any[];
      if (!dues.length) return json({ ok: true, sent: false });
      const out: unknown[] = [];
      for (const due of dues) {
        const to = ((due.to || []) as string[]).filter(isMail), cc = ((due.cc || []) as string[]).filter(isMail).filter((x) => !to.includes(x));
        if (!to.length && !cc.length) { out.push({ tenant: due.tenant, sent: false, reason: "no recipients" }); continue; }
        const app0 = due.app_name || "Solvix";
        const end = fmtD(due.ends_at), stage = Number(due.stage);
        const subject = stage === 0 ? `${app0} — انتهى اشتراك ${due.customer || ""}` : `${app0} — ينتهي اشتراك ${due.customer || ""} خلال ${stage === 1 ? "يوم واحد" : stage + " أيام"}`;
        const html = `<div dir="rtl" style="font-family:Tahoma,Arial;line-height:1.9">
          <h3 style="margin:0 0 8px">${stage === 0 ? "انتهى اشتراك " + esc(app0) : "تذكير بموعد انتهاء اشتراك " + esc(app0)}</h3>
          <div>العميل: ${esc(due.customer || "—")}</div><div>تاريخ الانتهاء: <b>${esc(end)}</b></div>
          ${stage === 0 ? `<p>يعمل النظام الآن في فترة السماح (${esc(due.grace_days)} أيام)، ثم يصبح <b>للقراءة فقط</b>: يبقى العرض والتصدير متاحين ولا يُحذف أي شيء، ويتوقف الجرد والتعديل حتى التجديد.</p>`
            : `<p>متبقٍ <b>${esc(due.days)}</b> ${Number(due.days) === 1 ? "يوم" : "أيام"}. بعد الانتهاء وفترة السماح يصبح النظام للقراءة فقط حتى التجديد.</p>`}
          <p>للتجديد: من ${esc(app0)} ← الإعدادات ← «الاشتراك والاستخدام» ← «طلب تجديد»، أو تواصل مع مزوّد الخدمة.</p></div>`;
        try {
          const id = await send(to.length ? to : cc, to.length ? cc : [], subject, html);
          await a.rpc("nv_sub_reminder_mark", { p_stage: stage, p_ends_at: due.ends_at, p_to: to.concat(cc), p_tenant: due.tenant || "t1" });
          out.push({ tenant: due.tenant, sent: true, stage, to, cc, id });
        } catch (e) { out.push({ tenant: due.tenant, sent: false, error: (e as Error).message }); }
      }
      return json({ ok: true, sent: out.some((x: any) => x.sent), results: out });
    }
    if (body.kind === "tenant_welcome") {
      if (!me.sys) return json({ error: "only the system Admin" }, 403);
      const { data: list, error } = await sb.rpc("nv_tenant_list");
      if (error) return json({ error: error.message }, 500);
      const t = ((list || []) as any[]).find((x) => x.id === body.tenant_id);
      if (!t) return json({ error: "customer not found" }, 404);
      const owner = String(body.owner_email || "").toLowerCase(), pw = String(body.owner_password || "");
      if (!isMail(owner) || pw.length < 8) return json({ error: "owner e-mail / password missing" }, 422);
      const url = /^https:\/\/[^\s"'<>]+$/.test(String(body.url || "")) ? String(body.url) : "";
      const to = [owner].concat(isMail(String(t.contact_email || "")) && t.contact_email !== owner ? [t.contact_email] : []);
      const cc = String(t.cc_emails || "").split(/[,;\s]+/).map((x: string) => x.trim().toLowerCase()).filter(isMail).filter((x: string) => !to.includes(x));
      const fmtOr = (x: string | null) => x ? esc(fmtD(x)) : "—";
      const lim = (k: string, l: string) => `<tr><td style="padding:4px 10px">${l}</td><td style="padding:4px 10px"><b>${t["max_" + k] ?? "بلا حد"}</b></td></tr>`;
      const PL: Record<string, string> = { trial: "تجريبي", quarterly: "ربع سنوي", half: "نصف سنوي", yearly: "سنوي", custom: "خاص" };
      const html = `<div dir="rtl" style="font-family:Tahoma,Arial;line-height:1.9;max-width:620px">
        <h2 style="margin:0 0 6px;color:#1e3a8a">مرحباً بكم في Solvix</h2>
        <p>تم تفعيل حساب <b>${esc(t.name)}</b> على منصة Solvix لجرد الأصول. فيما يلي بيانات الدخول والاشتراك:</p>
        <table style="border-collapse:collapse;border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px">
          <tr><td style="padding:6px 10px">رابط المنصة</td><td style="padding:6px 10px">${url ? `<a href="${esc(url)}">${esc(url)}</a>` : "—"}</td></tr>
          <tr><td style="padding:6px 10px">بريد الدخول</td><td style="padding:6px 10px" dir="ltr"><b>${esc(owner)}</b></td></tr>
          <tr><td style="padding:6px 10px">كلمة المرور</td><td style="padding:6px 10px" dir="ltr"><b>${esc(pw)}</b></td></tr></table>
        <p style="color:#b45309">يُنصح بتغيير كلمة المرور بعد أول دخول (قائمة المستخدم ← «تغيير كلمة المرور»).</p>
        <h3 style="margin:14px 0 4px">الاشتراك</h3>
        <div>الباقة: <b>${esc(PL[t.plan] || t.plan)}</b></div><div>من: ${fmtOr(t.starts_at)} — إلى: <b>${fmtOr(t.ends_at)}</b></div>
        <h3 style="margin:14px 0 4px">الحدود</h3>
        <table style="border-collapse:collapse;border:1px solid #e2e8f0">${lim("schools", "عدد المباني")}${lim("field", "مشرفو الميدان")}${lim("staff", "حسابات الإدارة")}${lim("assets", "عدد الأصول")}</table>
        <h3 style="margin:14px 0 4px">البدء</h3>
        <ol style="margin:0;padding-inline-start:20px"><li>ادخل برابط المنصة ببريدك وكلمة المرور.</li><li>من «المستخدمون» أضف مشرفي الميدان وحسابات فريقك.</li>
          <li>من «المباني» أضف مبانيك أو استوردها من Excel، ومن «الإعدادات ← نموذج بيانات المباني» حدّد حقولها.</li><li>يبدأ مشرفو الميدان الجرد من جوالاتهم بنفس الرابط.</li></ol></div>`;
      const id = await send(to, cc, `مرحباً بكم في Solvix — بيانات الدخول (${t.name})`, html);
      return json({ ok: true, to, cc, id });
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
    const { data: st } = await sb.from("nv_settings").select("data").limit(1).maybeSingle(); // NV34: RLS returns the caller's customer only
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
      html = `<div dir="rtl" style="font-family:Tahoma,Arial">تم ضبط إرسال البريد في ${esc(app)} بنجاح ✅<br>تصل تقارير المباني إلى: ${esc(to.join("، "))}</div>`;
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
        <h3 style="margin:0 0 8px">اكتمل جرد مبنى: ${esc(s.name)}</h3>
        <div>رقم المبنى: ${esc(s.moe)} · المعرّف: ${esc(s.ident)} · ${esc(s.city)} ${esc(s.district)}</div>
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
