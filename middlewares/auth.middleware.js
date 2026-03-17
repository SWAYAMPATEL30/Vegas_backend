import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

export default async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    // 1. Try verify local JWT first (for email/pass users)
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (err) {
    // 2. If local verify fails, try Supabase Auth (for Google users)
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) throw new Error('Invalid Supabase token');
      
      // Normalize user object for other middlewares/controllers
      req.user = { 
        id: user.id, 
        email: user.email, 
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuario Google',
        phone: user.user_metadata?.phone || '',
        role: 'client' 
      };
      return next();
    } catch (err) {
      console.error('[auth] Supabase getUser failed stack:', err.stack || err);
      res.status(401).json({ message: 'Invalid token' });
    }
  }
}
