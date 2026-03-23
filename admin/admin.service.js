import { supabase } from '../config/supabase.js';
import { APPOINTMENT_STATUS } from '../constants/appointmentStatus.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const THEME_FILE = path.join(__dirname, '..', 'theme.json');

export default {
  getAppointments: async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
      id,
      customer_name,
      customer_phone,
      customer_email,
      appointment_date,
      start_time,
      end_time,
      total_duration_minutes,
      status,
      rejection_reason,
      created_at,
      appointment_services (
        services (
          id,
          name,
          price,
          duration_minutes,
          type
        )
      )
    `)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  },

  getServices: async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    const priorityNames = ["Clásico", "Vegas Pro", "Premium"];
    return data.sort((a, b) => {
      const aIdx = priorityNames.indexOf(a.name);
      const bIdx = priorityNames.indexOf(b.name);

      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return 0;
    });
  },

  addService: async (payload) => {
    const { image_url, ...rest } = payload;
    const { data, error } = await supabase
      .from('services')
      .insert({
        ...rest,
        image: image_url || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateService: async (id, payload) => {
    const { image_url, ...rest } = payload;
    const { data, error } = await supabase
      .from('services')
      .update({
        ...rest,
        ...(image_url !== undefined && { image: image_url })
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteService: async (id) => {
    // 1. Delete references in appointment_services first due to foreign key constraint
    const { error: relationError } = await supabase
      .from('appointment_services')
      .delete()
      .eq('service_id', id);

    if (relationError) {
      console.error('[deleteService] Error removing relations:', relationError);
      throw relationError;
    }

    // 1b. Delete references in cart_items to prevent FK violations
    const { error: cartError } = await supabase
      .from('cart_items')
      .delete()
      .eq('service_id', id);

    if (cartError) {
      console.error('[deleteService] Error removing from cart_items:', cartError);
      throw cartError;
    }

    // 2. Delete the service itself
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Service and its relations deleted' };
  },

  blockSlot: async (payload) => {
    const { data, error } = await supabase
      .from('blocked_slots')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getTheme: async () => {
    try {
      const data = await fs.readFile(THEME_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[AdminService] Error reading theme file:', error);
      // Fallback if file doesn't exist
      return {
        primary: "#FDB400",
        secondary: "#9AC138",
        background: "#1A2722",
        foreground: "#FFFFFF",
        accent: "#7B9A2D"
      };
    }
  },

  updateTheme: async (theme) => {
    try {
      await fs.writeFile(THEME_FILE, JSON.stringify(theme, null, 2), 'utf8');
      return { success: true, theme };
    } catch (error) {
      console.error('[AdminService] Error writing theme file:', error);
      throw new Error('Error al guardar el tema');
    }
  },

  deleteBlockedSlot: async (id) => {
    const { error } = await supabase
      .from('blocked_slots')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Blocked slot removed' };
  },

  getBlockedSlots: async () => {
    const { data, error } = await supabase
      .from('blocked_slots')
      .select(`
      id,
      block_date,
      start_time,
      end_time,
      is_full_day,
      reason,
      created_at
    `)
      .order('block_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  },

  toggleBooking: async (enabled) => {
    const { data, error } = await supabase
      .from('settings')
      .update({ booking_enabled: enabled })
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getBookingStatus: async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('booking_enabled')
      .eq('id', 1)
      .single();

    if (error) throw error;
    return data.booking_enabled;
  },

  updateAppointmentStatus: async (appointmentId, status, reason) => {
    // 1. Validate status value
    if (!Object.values(APPOINTMENT_STATUS).includes(status)) {
      throw new Error('Invalid appointment status');
    }

    // 2. Fetch current appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('status')
      .eq('id', appointmentId)
      .single();

    if (error || !appointment) {
      throw new Error('Appointment not found');
    }

    const currentStatus = appointment.status;

    // 3. Status transition rules / validations
    // User requested to allow ALL transitions for admin from any state to any state.
    // Bypassing previous strict checks...

    // 5. Update appointment
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        status,
        rejection_reason:
          status === APPOINTMENT_STATUS.REJECTED ? reason : null
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    // send email to customer about status change
    try {
      const { sendAppointmentStatusEmail } = await import('../utils/email.js');
      sendAppointmentStatusEmail({ appointment: updatedAppointment });
    } catch (e) {
      console.error('appointment status email error', e);
    }



    return {
      message: 'Appointment status updated',
      appointment: updatedAppointment
    };
  },

  // helper for admin to verify mail system
  testEmail: async (to) => {
    if (!to) {
      throw new Error('Recipient email required');
    }

    const { sendEmail } = await import('../utils/email.js');
    await sendEmail({
      to,
      subject: 'Test message from Vegas system',
      text: 'This is a test email to verify sending functionality.'
    });
    return { message: `Test email sent to ${to}` };
  },

  uploadImage: async ({ fileName, fileType, content }) => {
    if (!content) throw new Error('File content is required');
    const buffer = Buffer.from(content, 'base64');
    
    const { data, error } = await supabase.storage
      .from('services')
      .upload(fileName, buffer, {
        contentType: fileType,
        upsert: true
      });

    if (error) {
      console.log('[uploadImage] Supabase error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('services')
      .getPublicUrl(fileName);

    return { publicUrl };
  }
};
