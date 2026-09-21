import { secrets } from "base44:runtime";

const FROM_EMAIL = "notificacion@comunidadconecta.com";
const CC_EMAIL = "mdiazco@gmail.com";

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { to, subject, html, text } = body || {};

    if (!to || !subject) {
      return Response.json({ error: "Faltan campos obligatorios: to, subject" }, { status: 400 });
    }

    const apiKey = secrets.get("RESEND_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "RESEND_API_KEY no configurado" }, { status: 500 });
    }

    const payload = {
      from: FROM_EMAIL,
      to,
      cc: CC_EMAIL,
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json({ error: data?.message || "Error enviando email", details: data }, { status: res.status });
    }

    return Response.json({ success: true, id: data.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}