export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ width: 190, height: 24, borderRadius: 6, backgroundColor: 'var(--border-light)' }} />
          <div style={{ width: 250, height: 14, borderRadius: 5, backgroundColor: 'var(--border-light)' }} />
        </div>
        <div style={{ width: 112, height: 34, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-orange-light)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="hne-card" style={{ minHeight: 112, backgroundColor: 'var(--bg-card)' }}>
            <div style={{ width: '56%', height: 13, borderRadius: 4, backgroundColor: 'var(--border-light)' }} />
            <div style={{ width: '38%', height: 26, marginTop: 16, borderRadius: 5, backgroundColor: 'var(--border-light)' }} />
          </div>
        ))}
      </div>
      <div className="hne-card" style={{ height: 290, backgroundColor: 'var(--bg-card)' }} />
    </div>
  );
}
