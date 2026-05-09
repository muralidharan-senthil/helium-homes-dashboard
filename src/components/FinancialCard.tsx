import type { Property, Status, InterestState } from '../types';
import { groupCalc, fmtINR, fmtINRk, fmtNum, HELIUM_PREMIUM } from '../utils';

interface Props {
  properties: Property[];
  group: Status;
  title: string;
  /** Label hint for the income row (Reserved/Unoccupied get "expected"/"projected"). */
  revenueLabel: string;
  interest: InterestState;
  onInterestChange: (next: InterestState) => void;
}

export function FinancialCard({ properties, group, title, revenueLabel, interest, onInterestChange }: Props) {
  const calc = groupCalc(properties, group, interest[group]);
  const isUnoccupied = group === 'ACTIVE';
  const premiumPct = (HELIUM_PREMIUM * 100).toFixed(0);
  const ownerPct   = ((1 - HELIUM_PREMIUM) * 100).toFixed(0);

  return (
    <div className="card fin-card">
      <div className="fin-card-head">
        <div className="fin-card-head-title">{title}</div>
        <div className="fin-card-head-count">{calc.count} unit{calc.count === 1 ? '' : 's'}</div>
      </div>
      <div className="fin-card-body">
        {/* --- Operational / portfolio metrics --- */}
        <Row label="Avg listed rent" value={fmtINR(calc.avgRent)} />
        {!isUnoccupied && <Row label="Avg days to rent" value={calc.avgDays != null ? fmtNum(calc.avgDays, 1) + ' days' : '—'} />}
        {!isUnoccupied && <Row label="Avg visits booked" value={calc.avgVisits != null ? fmtNum(calc.avgVisits, 1) : '—'} />}
        <Row label="Avg full deposit" value={fmtINR(calc.avgDeposit)} />
        <Row label="One month of rent (Helium promise)" value={fmtINRk(calc.oneMonthRent)} />
        <Row label="Loan availed (deposit − 1 month rent)" value={fmtINRk(calc.loan)} />

        {/* --- P&L breakdown --- */}
        <div className="pnl-block">
          <div className="pnl-section-label">Income</div>
          <Row label={`${revenueLabel} (tenant pays)`} value={fmtINRk(calc.tenantRevenue)} />

          <div className="pnl-section-label" style={{ marginTop: 10 }}>Expenses</div>
          <Row label={`Owner payout (${ownerPct}%)`} value={'−' + fmtINRk(calc.ownerPayout)} expense />
          <Row label="Interest to Fintree (on loan)" value={'−' + fmtINRk(calc.monthlyInterest)} expense />

          <div className="pnl-divider" />
          <Row
            label={`Helium revenue (${premiumPct}% premium)`}
            value={fmtINRk(calc.heliumRevenue)}
            emphasize
          />
        </div>

        {/* --- Interest slider --- */}
        <div className="slider-block">
          <div className="slider-row">
            <span className="slider-label">Interest rate (annual)</span>
            <span className="slider-value">{calc.interestRate.toFixed(1)}%</span>
          </div>
          <input
            type="range" min={0} max={20} step={0.1}
            value={calc.interestRate}
            onChange={(e) => onInterestChange({ ...interest, [group]: parseFloat(e.target.value) })}
          />
        </div>

        {/* --- Net profit --- */}
        <div className={`stat-row profit ${calc.profit < 0 ? 'negative' : ''}`} style={{ marginTop: 10 }}>
          <span className="stat-label" style={{ fontWeight: 600, color: 'var(--text)' }}>
            Net profit (Helium rev − Interest)
          </span>
          <span className="stat-value">{fmtINRk(calc.profit)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, expense, emphasize }: { label: string; value: string; expense?: boolean; emphasize?: boolean }) {
  return (
    <div className="stat-row">
      <span className="stat-label" style={emphasize ? { fontWeight: 600, color: 'var(--text)' } : undefined}>{label}</span>
      <span
        className="stat-value"
        style={{
          ...(expense ? { color: 'var(--danger)' } : null),
          ...(emphasize ? { color: 'var(--accent)', fontSize: 15 } : null),
        }}
      >
        {value}
      </span>
    </div>
  );
}
