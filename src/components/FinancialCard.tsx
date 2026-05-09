import type { Property, Status, InterestState } from '../types';
import { groupCalc, fmtINR, fmtINRk, fmtNum, HELIUM_RETAINER } from '../utils';

interface Props {
  properties: Property[];
  group: Status;
  title: string;
  interest: InterestState;
  onInterestChange: (next: InterestState) => void;
}

export function FinancialCard({ properties, group, title, interest, onInterestChange }: Props) {
  const calc = groupCalc(properties, group, interest[group]);
  const isVacant = group === 'ACTIVE';
  const retainerPct = (HELIUM_RETAINER * 100).toFixed(0);

  return (
    <div className="card fin-card">
      <div className="fin-card-head">
        <div className="fin-card-head-title">{title}</div>
        <div className="fin-card-head-count">{calc.count} unit{calc.count === 1 ? '' : 's'}</div>
      </div>
      <div className="fin-card-body">
        {/* --- Operational metrics --- */}
        <Row label="Avg listed rent" value={fmtINR(calc.avgRent)} />
        {!isVacant && <Row label="Avg days to rent" value={calc.avgDays != null ? fmtNum(calc.avgDays, 1) + ' days' : '—'} />}
        {!isVacant && <Row label="Avg visits booked" value={calc.avgVisits != null ? fmtNum(calc.avgVisits, 1) : '—'} />}
        <Row label="Avg full deposit" value={fmtINR(calc.avgDeposit)} />
        <Row label={isVacant ? 'FinTree loan (full deposit)' : 'FinTree loan (deposit − 1 mo)'} value={fmtINRk(calc.loan)} />

        {/* --- Recurring P&L (monthly) --- */}
        <div className="pnl-block">
          <div className="pnl-section-label">Recurring · monthly</div>
          <div className="pnl-mini-label">Income</div>
          <Row label={`Service fee (${retainerPct}% retainer)`} value={fmtINRk(calc.heliumServiceFee)} positive />

          <div className="pnl-mini-label" style={{ marginTop: 8 }}>Expenses</div>
          {isVacant && (
            <Row
              label="Rent paid to owner (no tenant)"
              value={'−' + fmtINRk(calc.ownerPayout)}
              expense
              tooltip="Helium pays owner regardless of occupancy"
            />
          )}
          <Row label="Interest to FinTree" value={'−' + fmtINRk(calc.monthlyInterest)} expense />

          <div className="pnl-divider" />
          <Row
            label="Net recurring profit"
            value={fmtINRk(calc.profit)}
            emphasize
            negative={calc.profit < 0}
          />
        </div>

        {/* --- Interest slider --- */}
        <div className="slider-block">
          <div className="slider-row">
            <span className="slider-label">FinTree interest rate (annual)</span>
            <span className="slider-value">{calc.interestRate.toFixed(1)}%</span>
          </div>
          <input
            type="range" min={0} max={20} step={0.1}
            value={calc.interestRate}
            onChange={(e) => onInterestChange({ ...interest, [group]: parseFloat(e.target.value) })}
          />
        </div>

        {/* --- One-time per new tenancy --- */}
        <div className="pnl-block">
          <div className="pnl-section-label">{isVacant ? 'Projected on first tenancy' : 'One-time on tenancy start'}</div>
          <Row label="Brokerage to Helium (1 mo rent)" value={fmtINRk(calc.heliumBrokerage)} positive />
          <Row label="Tenant deposit (applied to loan)" value={fmtINRk(calc.oneMonthRent)} />
        </div>
      </div>
    </div>
  );
}

function Row({
  label, value, expense, positive, emphasize, negative, tooltip,
}: { label: string; value: string; expense?: boolean; positive?: boolean; emphasize?: boolean; negative?: boolean; tooltip?: string }) {
  const valueStyle: React.CSSProperties = {};
  if (expense) valueStyle.color = 'var(--danger)';
  if (positive && !emphasize) valueStyle.color = 'var(--accent)';
  if (emphasize) {
    valueStyle.color = negative ? 'var(--danger)' : 'var(--success)';
    valueStyle.fontSize = 16;
  }
  return (
    <div className={`stat-row ${emphasize ? 'profit' : ''} ${negative && emphasize ? 'negative' : ''}`}>
      <span
        className="stat-label"
        style={emphasize ? { fontWeight: 600, color: 'var(--text)' } : undefined}
        title={tooltip}
      >
        {label}
      </span>
      <span className="stat-value" style={valueStyle}>{value}</span>
    </div>
  );
}
