import React from 'react';

export default function FinancePage() {
  const transactions = [
    { id: 1, client: 'Amir Karimov', space: 'Focus Hub', amount: '+280 000', date: '14 авг', type: 'Оплата', status: 'paid' },
    { id: 2, client: 'Nodira Aliyeva', space: 'Focus Hub', amount: '+720 000', date: '13 авг', type: 'Оплата', status: 'paid' },
    { id: 3, client: 'Bekzod T.', space: 'Navoiy Event', amount: '+540 000', date: '12 авг', type: 'Оплата', status: 'paid' },
    { id: 4, client: 'Jasur M.', space: 'Blue Line', amount: '-110 000', date: '11 авг', type: 'Возврат', status: 'cancelled' },
  ];
  return (
    <div className="adm-anim adm-anim-1">
      <div className="adm-kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        <div className="adm-kpi-card navy"><div className="adm-kpi-label">Доход за месяц</div><div className="adm-kpi-value">5.78M</div><div className="adm-kpi-delta up">↑ 24% vs прошлый</div></div>
        <div className="adm-kpi-card orange"><div className="adm-kpi-label">Ожидают выплаты</div><div className="adm-kpi-value">1.2M</div><div className="adm-kpi-delta up">3 партнёра</div></div>
        <div className="adm-kpi-card teal"><div className="adm-kpi-label">Возвраты</div><div className="adm-kpi-value">110K</div><div className="adm-kpi-delta down">↓ 2 за месяц</div></div>
      </div>
      <div className="adm-card">
        <div className="adm-card-pad">
          <div className="adm-card-head"><div className="adm-card-title">Транзакции</div><button className="adm-btn adm-btn-outline" style={{fontSize:12,padding:'6px 12px'}}>Экспорт CSV</button></div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>{['Дата', 'Клиент', 'Пространство', 'Тип', 'Сумма', 'Статус'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
            <tbody>{transactions.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{t.date}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>{t.client}</td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{t.space}</td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{t.type}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: t.amount.startsWith('+') ? '#16a34a' : '#dc2626' }}>{t.amount} UZS</td>
                <td style={{ padding: '12px 16px' }}><span className={`adm-status-pill ${t.status}`}>{t.status === 'paid' ? 'Оплачено' : 'Возврат'}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
