import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Cuerpo de la solicitud inválido.' }, { status: 400 });
    }

    const full_name = (body?.full_name || '').toString().trim();
    const rut = (body?.rut || '').toString().trim();
    const email = (body?.email || '').toString().trim();
    const phone = (body?.phone || '').toString().trim();

    if (!full_name || !rut || !email || !phone) {
      return Response.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return Response.json({ error: 'El email ingresado no es válido.' }, { status: 400 });
    }

    const rutClean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (rutClean.length < 7) {
      return Response.json({ error: 'El RUT ingresado no es válido.' }, { status: 400 });
    }

    // Guarda el lead (service role: la Landing es pública, sin usuario autenticado)
    const lead = await base44.asServiceRole.entities.Lead.create({
      full_name,
      rut,
      email,
      phone,
      status: 'nuevo'
    });

    // Notifica a los administradores de la plataforma por correo
    let notified = 0;
    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const recipients = (admins || []).map((u) => u.email).filter(Boolean);
      for (const to of recipients) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to,
          subject: 'Nuevo registro de interesado en Comunidad Conecta',
          text:
            'Se ha registrado un nuevo interesado en la plataforma:\n\n' +
            'Nombre: ' + full_name + '\n' +
            'RUT: ' + rut + '\n' +
            'Email: ' + email + '\n' +
            'Teléfono: ' + phone + '\n\n' +
            'Revisa el panel de administración para gestionar este lead.'
        });
        notified++;
      }
    } catch (e) {
      // La notificación es complementaria; no falla el registro si el correo falla.
    }

    return Response.json({ ok: true, lead_id: lead.id, notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}