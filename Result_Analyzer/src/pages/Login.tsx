/**
 * LOGIN PAGE COMPONENT
 * ====================
 * Beautiful login page with college logo and form validation
 */

import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const Login = () => {
  // ============================================================
  // HOOKS
  // ============================================================
  
  const navigate = useNavigate();
  const { login, user } = useAuth();
  
  // ============================================================
  // STATE
  // ============================================================
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // ============================================================
  // REDIRECT IF ALREADY LOGGED IN
  // ============================================================
  
  /**
   * If user is already logged in, redirect to appropriate dashboard
   * This runs after successful login
   */
  useEffect(() => {
    console.log('🔐 Login useEffect triggered');
    console.log('   User:', user);
    console.log('   User Role:', user?.role);
    
    if (user) {
      console.log('👤 User exists, redirecting based on role:', user.role);
      
      // Redirect based on role
      switch (user.role) {
        case 'ADMIN':
          console.log('➡️ Redirecting to /admin/dashboard');
          navigate('/admin/dashboard');
          break;
        case 'HOD':
          console.log('➡️ Redirecting to /hod/dashboard');
          navigate('/hod/dashboard');
          break;
        case 'TEACHER':
          console.log('➡️ Redirecting to /teacher/dashboard');
          navigate('/teacher/dashboard');
          break;
        case 'STUDENT':
          console.log('➡️ Redirecting to /student/dashboard');
          navigate('/student/dashboard');
          break;
        default:
          console.log('⚠️ Unknown role:', user.role);
      }
    } else {
      console.log('👻 No user in Login useEffect');
    }
  }, [user, navigate]);
  
  // ============================================================
  // FORM SUBMISSION HANDLER
  // ============================================================
  
  /**
   * Handle Login Form Submit
   * 
   * Steps:
   * 1. Validate inputs
   * 2. Call login API
   * 3. If successful, useAuth will update state
   * 4. Component will re-render and redirect (see above)
   * 5. If failed, show error message
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent page refresh
    
    // Clear previous errors
    setError('');
    
    // Validate inputs
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    
    // Show loading state
    setLoading(true);
    
    try {
      // Call login function from AuthContext
      await login({ email: email.trim(), password });
      
      // Success! User state will update and redirect will happen above
      // No need to do anything here
      
    } catch (err: any) {
      // Login failed, show error message
      setError(err.message || 'Login failed. Please try again.');
      
    } finally {
      // Hide loading state
      setLoading(false);
    }
  };
  
  // ============================================================
  // QUICK LOGIN BUTTONS (Development Only)
  // ============================================================
  
  /**
   * Quick login for testing different roles
   * Only shown in development mode
   */
  const quickLogin = (role: string) => {
    const credentials = {
      ADMIN: { email: 'admin@gmail.com', password: 'admin123' },
      HOD: { email: 'examplemail@gmail.com', password: 'T001' },
      TEACHER: { email: 'abc@gmail.com', password: 'T010' },
      STUDENT: { email: 'mypt1991@gmail.com', password: '1BI23IS082' },
    };
    
    const cred = credentials[role as keyof typeof credentials];
    setEmail(cred.email);
    setPassword(cred.password);
  };
  
  // ============================================================
  // RENDER
  // ============================================================
  
  return (
    <div className="login-container">
      {/* Background gradient */}
      <div className="login-background"></div>
      
      {/* Login card */}
      <div className="login-card">
        {/* College Logo */}
        <div className="login-logo">
          <img 
            src="/Logo.jpeg" 
            alt="College Logo" 
            className="college-logo"
          />
        </div>
        
        {/* Title */}
        <h1 className="login-title">Result Analyser</h1>
        <p className="login-subtitle">Sign in to access your dashboard</p>
        
        {/* Error Message */}
        {error && (
          <div className="error-message">
            <svg className="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        
        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* Email Input */}
          <div className="form-group">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="form-input"
              disabled={loading}
              autoComplete="email"
            />
          </div>
          
          {/* Password Input */}
          <div className="form-group">
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="form-input"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password-btn"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        {/* Quick Login Buttons (Development Only) */}
        {import.meta.env.DEV && (
          <div className="quick-login">
            <p className="quick-login-title">Quick Login (Dev Only)</p>
            <div className="quick-login-buttons">
              <button onClick={() => quickLogin('STUDENT')} className="quick-btn student">
                Student
              </button>
              <button onClick={() => quickLogin('TEACHER')} className="quick-btn teacher">
                Teacher
              </button>
              <button onClick={() => quickLogin('HOD')} className="quick-btn hod">
                HOD
              </button>
              <button onClick={() => quickLogin('ADMIN')} className="quick-btn admin">
                Admin
              </button>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="login-footer">
          <p>Forgot your password? Contact administrator</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
