import { supabase } from '../config/supabase.js';
import { isWithin7Days } from '../utils/date.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const THEME_FILE = path.join(__dirname, '..', 'theme.json');

export default {
  getServices: async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (!data) return [];

    const priorityNames = ["Clásico", "Vegas Pro", "Premium"];
    
    // Sort logic: priority services first in specified order, then others by created_at
    return data.sort((a, b) => {
      const aIdx = priorityNames.indexOf(a.name);
      const bIdx = priorityNames.indexOf(b.name);

      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      
      return 0; // Maintain created_at order from query
    });
  },

  getTheme: async () => {
    try {
      const data = await fs.readFile(THEME_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {
        primary: "#FDB400",
        secondary: "#9AC138",
        background: "#1A2722",
        foreground: "#FFFFFF",
        accent: "#7B9A2D"
      };
    }
  },

  getBookingStatus: async () => {
    const { data } = await supabase.from('settings').select('booking_enabled').eq('id', 1).single();
    return data?.booking_enabled ?? true;
  },

  getBlockedSlots: async () => {
    const { data } = await supabase.from('blocked_slots').select('*');
    return data || [];
  },

  addToCart: async (userId, serviceId) => {
    // 1. Get or create cart
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (cartError && cartError.code !== 'PGRST116') {
      throw cartError;
    }

    let cartId = cart?.id;

    if (!cartId) {
      const { data: newCart, error } = await supabase
        .from('carts')
        .insert({ user_id: userId })
        .select()
        .single();

      if (error) throw error;
      cartId = newCart.id;
    }

    // 2. Check if service already exists in cart
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id')
      .eq('cart_id', cartId)
      .eq('service_id', serviceId)
      .maybeSingle();

    if (existingItem) {
      return {
        message: 'Service already in cart',
        alreadyExists: true
      };
    }

    // 3. Insert service into cart
    const { error: insertError } = await supabase
      .from('cart_items')
      .insert({
        cart_id: cartId,
        service_id: serviceId
      });

    // 4. Handle unique constraint violation gracefully
    if (insertError?.code === '23505') {
      return {
        message: 'Service already in cart',
        alreadyExists: true
      };
    }

    if (insertError) throw insertError;

    return {
      message: 'Added to cart',
      added: true
    };
  },


  getCart: async (userId) => {
    // 1. Get user's cart
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!cart) return [];

    // 2. Get cart items with service details
    const { data } = await supabase
      .from('cart_items')
      .select(`
      id,
      services (
        id,
        name,
        price,
        duration_minutes,
        type
      )
    `)
      .eq('cart_id', cart.id);

    return data;
  },

  removeFromCart: async (userId, serviceId) => {
    // 1. Get user's cart
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!cart) {
      throw new Error('Cart not found');
    }

    // 2. Remove the service from cart_items
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id)
      .eq('service_id', serviceId);

    if (error) {
      throw error;
    }

    return { message: 'Service removed from cart' };
  },

  bookAppointment: async (user, payload) => {
    if (!user || !user.id) {
      throw new Error('User is not properly authenticated or missing ID');
    }

    if (!isWithin7Days(payload.appointment_date)) {
      throw new Error('Booking allowed only for next 7 days');
    }

    // 1. Get cart
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!cart) {
      throw new Error('Cart is empty');
    }

    // 2. Get cart services
    const { data: cartItems } = await supabase
      .from('cart_items')
      .select(`
      service_id,
      services (
        duration_minutes
      )
    `)
      .eq('cart_id', cart.id);

    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // 3. Calculate total duration
    const totalDuration = cartItems.reduce(
      (sum, item) => sum + item.services.duration_minutes,
      0
    );

    // 4. Server-side Collision Check
    const { data: existingAppts } = await supabase
      .from('appointments')
      .select('start_time, total_duration_minutes, status')
      .eq('appointment_date', payload.appointment_date);

    const testStart = (time) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const newStart = testStart(payload.start_time);
    const newEnd = newStart + totalDuration;

    const conflict = existingAppts?.some(data => {
      if (data.status === 'cancelled' || data.status === 'rejected') return false;
      const start = testStart(data.start_time);
      const end = start + (data.total_duration_minutes || 15);
      return (newStart < end && newEnd > start);
    });

    if (conflict) {
      throw new Error('¡Conflict! Este horario ya no está disponible.');
    }

    // 5. Create appointment
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .insert({
        customer_id: user.id,
        customer_name: user.name || 'Cliente',
        customer_phone: user.phone || '0000000000',
        customer_email: user.email,
        appointment_date: payload.appointment_date,
        start_time: payload.start_time,
        end_time: payload.end_time,
        total_duration_minutes: totalDuration
      })
      .select()
      .single();

    if (apptError || !appointment) {
      console.error('[bookAppointment] Insert failed or returned null:', apptError || 'No appointment data returned');
      throw apptError || new Error('Failed to create appointment row. No data returned by insert().');
    }

    // 5. Link services to appointment
    const appointmentServices = cartItems.map(item => ({
      appointment_id: appointment.id,
      service_id: item.service_id
    }));

    await supabase
      .from('appointment_services')
      .insert(appointmentServices);

    // 6. Clear cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);

      // send confirmation to user and notification to admin
      try {
        const { sendBookingConfirmation, sendAdminNotification } = await import('../utils/email.js');
        
        console.log('[bookAppointment] Triggering background emails for:', user.email);

        // Run in background so HTTP response returns instantly
        sendBookingConfirmation({ name: user.name, email: user.email, appointment })
          .catch(e => console.error('[bookAppointment] Background sendBookingConfirmation failed:', e));

        sendAdminNotification({ appointment, user })
          .catch(e => console.error('[bookAppointment] Background sendAdminNotification failed:', e));

      } catch (e) {
        console.error('[bookAppointment] dynamic import error:', e);
      }

    return {
      message: 'Appointment booked successfully',
      appointment
    };
  },

  getBookedAppointments: async (date) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('start_time, end_time, total_duration_minutes, status')
      .eq('appointment_date', date);

    if (error) throw error;
    return data;
  },

  myAppointments: async (userId) => {
    const { data } = await supabase
      .from('appointments')
      .select(`
      id,
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
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    return data;
  },

  cancelAppointment: async (userId, appointmentId) => {
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('id', appointmentId)
      .eq('customer_id', userId)
      .single();

    if (fetchError || !appointment) {
      throw new Error('Cita no encontrada o no pertenece al usuario');
    }

    if (appointment.status !== 'pending' && appointment.status !== 'confirmed') {
      throw new Error('Solo se pueden cancelar citas pendientes o confirmadas');
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;

    // Optional: send notification to admin about cancellation
    try {
      const { sendEmail } = await import('../utils/email.js');
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        sendEmail({
          to: adminEmail,
          subject: 'Cita Cancelada por el Usuario',
          html: `<h2>Cita Cancelada</h2><p>El usuario ha cancelado su cita con ID: ${appointmentId}</p>`
        });
      }
    } catch (e) {
      console.error('Error sending cancellation mail to admin', e);
    }

    return data;
  }
};
