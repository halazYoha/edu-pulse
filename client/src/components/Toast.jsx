import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

/**
 * Toast – inline notification banner
 * Props: type ('success'|'error'), message (string), onClose (fn)
 * Auto-dismisses after 4 s unless persistent=true
 */
const Toast = ({ type = 'success', message, onClose, persistent = false }) => {
  useEffect(() => {
    if (!message || persistent) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message, persistent, onClose]);

  if (!message) return null;

  const isSuccess = type === 'success';
  const bg   = isSuccess ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)';
  const border = isSuccess ? 'rgba(16,185,129,0.30)' : 'rgba(239,68,68,0.30)';
  const color  = isSuccess ? '#34d399' : '#f87171';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      backgroundColor: bg, border: `1px solid ${border}`,
      borderRadius: '8px', color, padding: '12px 14px',
      fontSize: '0.86rem', marginBottom: '20px', lineHeight: 1.4,
      animation: 'fadeIn 0.25s ease'
    }}>
      {isSuccess
        ? <CheckCircle size={16} style={{ flexShrink: 0 }} />
        : <AlertCircle size={16} style={{ flexShrink: 0 }} />}
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color, padding: '2px', display: 'flex'
      }}>
        <X size={14} />
      </button>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
};

export default Toast;
