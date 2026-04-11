interface Props {
  pageName: string;
  onReset: () => void;
}

export function PageErrorFallback({ pageName, onReset }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '400px',
      gap: '12px',
      color: '#e8e8f0',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ fontSize: '32px' }}>🔄</div>
      <div style={{ fontSize: '16px', fontWeight: 500 }}>
        {pageName} failed to load
      </div>
      <div style={{
        fontSize: '12px',
        color: 'rgba(255,255,255,0.4)'
      }}>
        This section encountered an error
      </div>
      <button
        onClick={onReset}
        style={{
          padding: '8px 20px',
          background: 'rgba(124,110,247,0.2)',
          color: '#a89ef7',
          border: '0.5px solid rgba(124,110,247,0.4)',
          borderRadius: '8px',
          fontSize: '13px',
          cursor: 'pointer'
        }}
      >
        Reload section
      </button>
    </div>
  );
}
