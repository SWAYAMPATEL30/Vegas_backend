import nodemailer from 'nodemailer';

// configure once using environment variables
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // IMPORTANT for cloud platforms
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// simple wrapper
export const sendEmail = async ({ to, subject, text, html }) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Gmail credentials not configured, skipping sendEmail');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      text,
      html
    });

    console.log(`email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('sendEmail error (ignored)', err.message);
    // ✅ DO NOT throw
  }
};

// helpers para notificaciones comunes
export const sendWelcomeEmail = ({ name, email }) => {
  const subject = 'Bienvenido a Vegas Estudio';
  const html = `
    <h2>¡Hola ${name || 'bienvenido'}!</h2>
    <p>Gracias por registrarte en nuestro sistema de reservas. Estamos encantados de tenerte con nosotros.</p>
    <p>Ahora puedes reservar servicios y gestionar tus citas fácilmente.</p>
    <p>Saludos,<br/>Equipo Vegas</p>
  `;
  return sendEmail({ to: email, subject, html });
};

export const sendLoginNotification = ({ name, email }) => {
  const subject = 'Notificación de Inicio de Sesión Exitosa';
  const html = `
    <h2>Hola ${name || 'allí'},</h2>
    <p>Esta es una nota rápida para informarte que has iniciado sesión correctamente en tu cuenta de Vegas.</p>
    <p>Si no fuiste tú, por favor contacta al soporte de inmediato.</p>
    <p>Gracias,<br/>Equipo Vegas</p>
  `;
  return sendEmail({ to: email, subject, html });
};

export const sendBookingConfirmation = ({ name, email, appointment }) => {
  console.log('[sendBookingConfirmation] Details:', { name, email, appointment });
  
  const subject = 'Solicitud de Cita Recibida';
  const html = `
    <h2>Hola ${name || 'allí'},</h2>
    <p>Tu solicitud de cita ha sido recibida con los siguientes detalles:</p>
    <ul>
      <li><strong>Fecha:</strong> ${appointment.appointment_date}</li>
      <li><strong>Hora de inicio:</strong> ${appointment.start_time}</li>
      <li><strong>Hora de finalización:</strong> ${appointment.end_time}</li>
    </ul>
    <p>Te notificaremos una vez que la cita sea confirmada.</p>
    <p>¡Gracias por elegirnos!<br/>Equipo Vegas</p>
  `;
  return sendEmail({ to: email, subject, html });
};

export const sendAppointmentStatusEmail = ({ appointment }) => {
  const { customer_name, customer_email, status, rejection_reason } = appointment;
  let subject;
  let html;

  if (status === 'confirmed') {
    subject = 'Tu Cita Ha Sido Confirmada';
    html = `
      <h2>Hola ${customer_name || 'allí'},</h2>
      <p>¡Tu cita ha sido <strong>confirmada</strong>!</p>
      <p>Detalles:</p>
      <ul>
        <li><strong>Fecha:</strong> ${appointment.appointment_date}</li>
        <li><strong>Inicio:</strong> ${appointment.start_time}</li>
        <li><strong>Fin:</strong> ${appointment.end_time}</li>
      </ul>
      <p>Esperamos verte pronto.</p>
      <p>Saludos cordiales,<br/>Equipo Vegas</p>
    `;
  } else if (status === 'rejected') {
    subject = 'Tu Solicitud de Cita Fue Rechazada';
    html = `
      <h2>Hola ${customer_name || 'allí'},</h2>
      <p>Lamentablemente, tu solicitud de cita ha sido <strong>rechazada</strong>.</p>
      <p>Motivo: ${rejection_reason || 'No especificado'}</p>
      <p>Por favor, intenta reservar un horario diferente o contacta a soporte.</p>
      <p>Saludos,<br/>Equipo Vegas</p>
    `;
  } else if (status === 'cancelled') {
    subject = 'Tu Cita Ha Sido Cancelada';
    html = `
      <h2>Hola ${customer_name || 'allí'},</h2>
      <p>Tu cita ha sido cancelada.</p>
      <p>Si tienes alguna pregunta, por favor contáctanos.</p>
      <p>Saludos,<br/>Equipo Vegas</p>
    `;
  } else {
    // otros estados pueden ser ignorados o no enviados
    return;
  }

  return sendEmail({ to: customer_email, subject, html });
};

export const sendAdminNotification = ({ appointment, user }) => {
  const subject = 'Nueva Solicitud de Cita Enviada';
  const html = `
    <h2>Nueva cita pendiente de aprobación</h2>
    <p>El usuario <strong>${user.name}</strong> (${user.email}) ha solicitado una cita:</p>
    <ul>
      <li><strong>Fecha:</strong> ${appointment.appointment_date}</li>
      <li><strong>Inicio:</strong> ${appointment.start_time}</li>
      <li><strong>Fin:</strong> ${appointment.end_time}</li>
    </ul>
    <p>Por favor, inicia sesión en el panel de administración para confirmar o rechazar la solicitud.</p>
  `;
  return sendEmail({ to: process.env.ADMIN_EMAIL, subject, html });
};
