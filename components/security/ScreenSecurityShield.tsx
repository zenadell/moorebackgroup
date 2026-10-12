'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ShieldAlert, Lock, EyeOff, AlertTriangle } from 'lucide-react';

interface ScreenSecurityShieldProps {
  principalName?: string;
  covenantId?: string;
  enabled?: boolean;
}

export function ScreenSecurityShield({
  principalName = 'Declan Salo',
  covenantId = 'MBG-88429-PRI',
  enabled = true,
}: ScreenSecurityShieldProps) {
  const [isObfuscated, setIsObfuscated] = useState<boolean>(false);
  const [alertNotice, setAlertNotice] = useState<string | null>(null);
  const [liveTimestamp, setLiveTimestamp] = useState<string>('');
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update live watermark timestamp every 10 seconds
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTimestamp(
        `${now.toISOString().replace('T', ' ').substring(0, 19)} UTC`
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const triggerSecurityAlert = useCallback((msg: string) => {
    setAlertNotice(msg);
    setIsObfuscated(true);
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => {
      setAlertNotice(null);
      setIsObfuscated(false);
    }, 4000);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // 1. Focus Loss & Window Blur Protection
    // When screenshot tool (Snipping Tool, CleanShot, Mac Cmd+Shift+4) or external app takes focus:
    const handleBlur = () => {
      setIsObfuscated(true);
    };

    const handleFocus = () => {
      // Only clear if not in an active hotkey violation alert
      if (!alertNotice) {
        setIsObfuscated(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsObfuscated(true);
      } else {
        if (!alertNotice) {
          setIsObfuscated(false);
        }
      }
    };

    // 2. Keyboard Screenshot & Extraction Interception
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen (Windows)
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        e.stopPropagation();
        try {
          navigator.clipboard?.writeText('');
        } catch {}
        triggerSecurityAlert('PrintScreen attempt intercepted. Institutional ledger export prohibited.');
        return;
      }

      // Mac screenshot combinations (Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5)
      // Note: OS handles Cmd+Shift, but browser catches keydown first or loses focus
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key === '3' || e.key === '4' || e.key === '5' || e.code === 'Digit3' || e.code === 'Digit4' || e.code === 'Digit5')
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert('Screen capture shortcut restricted by MooreBach Security Protocol.');
        return;
      }

      // Windows Snipping Tool / Edge capture (Win/Ctrl/Cmd + Shift + S)
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key === 's' || e.key === 'S' || e.code === 'KeyS')
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert('Selective screen snipping restricted by MooreBach Security Protocol.');
        return;
      }

      // Print dialog (Cmd/Ctrl + P)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'p' || e.key === 'P' || e.code === 'KeyP')) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert('Printing is strictly prohibited on this private institutional account.');
        return;
      }

      // Save page (Cmd/Ctrl + S without shift)
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        (e.key === 's' || e.key === 'S' || e.code === 'KeyS')
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert('Page saving and DOM serialization restricted.');
        return;
      }

      // Inspect Element & Developer Tools (F12 or Cmd/Ctrl + Shift + I/C/J)
      if (
        e.key === 'F12' ||
        ((e.metaKey || e.ctrlKey) &&
          e.shiftKey &&
          (e.key === 'i' || e.key === 'I' || e.key === 'c' || e.key === 'C' || e.key === 'j' || e.key === 'J'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert('Developer tools and DOM inspection restricted for vault security.');
        return;
      }

      // View Source (Cmd/Ctrl + U)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'u' || e.key === 'U' || e.code === 'KeyU')) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert('Source view restricted.');
        return;
      }
    };

    // 3. Right Click (Context Menu) Prevention
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerSecurityAlert('Context menu and image extraction restricted.');
    };

    // 4. Copy Event Hook (Clears financial numbers if copied)
    const handleCopy = (e: ClipboardEvent) => {
      // Allow internal form field copying if typing, else restrict
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      if (!isInput) {
        e.preventDefault();
        triggerSecurityAlert('Direct clipboard extraction restricted on institutional records.');
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, [enabled, alertNotice, triggerSecurityAlert]);

  if (!enabled) return null;

  return (
    <>
      {/* 1. Dynamic Diagonal Forensic Watermark (Invisible to casual reading, captures on external camera/phone photos) */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 40,
          overflow: 'hidden',
          opacity: 0.045,
          userSelect: 'none',
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'space-around',
          justifyContent: 'space-around',
          transform: 'rotate(-22deg) scale(1.3)',
          transformOrigin: 'center center',
        }}
      >
        {Array.from({ length: 35 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              padding: '24px 32px',
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            MOOREBACH GROUP • {principalName} • {covenantId} • {liveTimestamp} • CONFIDENTIAL
          </div>
        ))}
      </div>

      {/* 2. Instant Anti-Capture Obfuscation Screen Shield */}
      {/* Triggers instantly when user pulls focus away (Snipping Tool, Cmd+Shift+4, screen recording hooks, tab switch) */}
      {isObfuscated && (
        <div
          onClick={() => {
            setIsObfuscated(false);
            setAlertNotice(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(45px)',
            WebkitBackdropFilter: 'blur(45px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            cursor: 'pointer',
            animation: 'fadeInShield 0.15s ease-out forwards',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '20px',
              padding: '36px 32px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(37, 99, 235, 0.15)',
            }}
          >
            {/* Pulsing Security Shield Icon */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                backgroundColor: 'rgba(37, 99, 235, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <EyeOff style={{ width: '30px', height: '30px' }} />
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: '14px',
              }}
            >
              <Lock style={{ width: '12px', height: '12px' }} />
              <span>Anti-Capture Protection Active</span>
            </div>

            <h3
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '8px',
                letterSpacing: '-0.02em',
              }}
            >
              Institutional Ledger Obfuscated
            </h3>

            <p
              style={{
                fontSize: '13px',
                color: '#94a3b8',
                lineHeight: '1.6',
                marginBottom: '24px',
              }}
            >
              {alertNotice ||
                'To safeguard private portfolio assets against unauthorized capture, screen recording, or application-level extraction, display is temporarily obscured while focus is outside this portal.'}
            </p>

            <div
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '11px',
                color: '#64748b',
                textAlign: 'left',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontFamily: 'monospace',
              }}
            >
              <div>
                <span style={{ color: '#94a3b8' }}>Account:</span> {principalName}
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Covenant Ref:</span> {covenantId}
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Security Level:</span> Level 4 Sovereign Clearance
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Ledger Timestamp:</span> {liveTimestamp}
              </div>
            </div>

            <button
              onClick={() => {
                setIsObfuscated(false);
                setAlertNotice(null);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              Click Anywhere or Tap to Restore View
            </button>
          </div>
        </div>
      )}

      {/* 3. Floating Security Alert Toast (For instant feedback on hotkey attempt) */}
      {alertNotice && !isObfuscated && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            backgroundColor: '#0f172a',
            border: '1px solid #ef4444',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            fontWeight: 600,
            animation: 'slideDownAlert 0.2s ease-out forwards',
          }}
        >
          <AlertTriangle style={{ width: '16px', height: '16px', color: '#f87171', flexShrink: 0 }} />
          <span>{alertNotice}</span>
        </div>
      )}
    </>
  );
}
