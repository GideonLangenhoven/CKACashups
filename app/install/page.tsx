export default function InstallPage() {
  return (
    <div className="stack" style={{ maxWidth: 600, margin: '0 auto' }}>
      <h2>Install CKA Cashups</h2>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>📱 iPhone/iPad (iOS)</h3>
        <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>Open <strong>y-rose-seven.vercel.app</strong> in Safari</li>
          <li>Tap the <strong>Share</strong> button (square with arrow pointing up)</li>
          <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
          <li>Tap <strong>"Add"</strong> in the top right</li>
          <li>The app will appear on your home screen with the CKA logo</li>
        </ol>
        <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '1rem' }}>
          ⚠️ <strong>Note:</strong> Must use Safari browser on iOS. Chrome and other browsers don't support this feature on iPhone.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>🤖 Android</h3>
        <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>Open <strong>y-rose-seven.vercel.app</strong> in Chrome</li>
          <li>Tap the <strong>menu</strong> (three dots) in the top right</li>
          <li>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
          <li>Tap <strong>"Add"</strong> or <strong>"Install"</strong></li>
          <li>The app will appear on your home screen</li>
        </ol>
        <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '1rem' }}>
          💡 <strong>Tip:</strong> You may see an automatic "Install" banner at the bottom of the screen. Just tap "Install" to add it instantly!
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>✨ Benefits of Installing</h3>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>App icon on your home screen with CKA logo</li>
          <li>Opens in full screen (no browser bars)</li>
          <li>Faster loading with offline support</li>
          <li>Feels like a native app</li>
          <li>Quick access - just tap the icon</li>
        </ul>
      </div>

      <div className="card" style={{ background: '#f8fafc' }}>
        <h3 style={{ marginTop: 0 }}>🔗 Share This Link</h3>
        <p style={{ marginBottom: '0.5rem' }}>Send this link to guides and team members:</p>
        <div style={{
          background: 'white',
          padding: '0.75rem',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          wordBreak: 'break-all'
        }}>
          https://y-rose-seven.vercel.app
        </div>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.75rem', marginBottom: 0 }}>
          They can install it following the instructions above!
        </p>
      </div>
    </div>
  );
}
