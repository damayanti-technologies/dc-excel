import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Binary,
  Layers,
  DollarSign,
  BarChart2,
  Cpu,
  ArrowRightLeft,
  Copy,
  Check,
  Sparkles,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/stores/toast-store';

type ToolTab =
  | 'basic'
  | 'scientific'
  | 'finance'
  | 'engineering'
  | 'statistics'
  | 'converter'
  | 'number_systems';

const UNIT_UNITS: Record<string, { label: string; toBase: (v: number) => number; fromBase: (v: number) => number }[]> = {
  length: [
    { label: 'Meters (m)', toBase: (v) => v, fromBase: (v) => v },
    { label: 'Kilometers (km)', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
    { label: 'Centimeters (cm)', toBase: (v) => v * 0.01, fromBase: (v) => v / 0.01 },
    { label: 'Millimeters (mm)', toBase: (v) => v * 0.001, fromBase: (v) => v / 0.001 },
    { label: 'Inches (in)', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
    { label: 'Feet (ft)', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
    { label: 'Miles (mi)', toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 }
  ],
  mass: [
    { label: 'Kilograms (kg)', toBase: (v) => v, fromBase: (v) => v },
    { label: 'Grams (g)', toBase: (v) => v * 0.001, fromBase: (v) => v * 1000 },
    { label: 'Pounds (lb)', toBase: (v) => v * 0.45359237, fromBase: (v) => v / 0.45359237 },
    { label: 'Ounces (oz)', toBase: (v) => v * 0.028349523, fromBase: (v) => v / 0.028349523 }
  ],
  temperature: [
    { label: 'Celsius (°C)', toBase: (v) => v, fromBase: (v) => v },
    { label: 'Fahrenheit (°F)', toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
    { label: 'Kelvin (K)', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 }
  ],
  digital: [
    { label: 'Bytes (B)', toBase: (v) => v, fromBase: (v) => v },
    { label: 'Kilobytes (KB)', toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
    { label: 'Megabytes (MB)', toBase: (v) => v * 1024 * 1024, fromBase: (v) => v / (1024 * 1024) },
    { label: 'Gigabytes (GB)', toBase: (v) => v * 1024 * 1024 * 1024, fromBase: (v) => v / (1024 * 1024 * 1024) },
    { label: 'Terabytes (TB)', toBase: (v) => v * 1024 ** 4, fromBase: (v) => v / 1024 ** 4 }
  ],
  pressure: [
    { label: 'Pascals (Pa)', toBase: (v) => v, fromBase: (v) => v },
    { label: 'Bar', toBase: (v) => v * 100000, fromBase: (v) => v / 100000 },
    { label: 'PSI', toBase: (v) => v * 6894.76, fromBase: (v) => v / 6894.76 },
    { label: 'Atmosphere (atm)', toBase: (v) => v * 101325, fromBase: (v) => v / 101325 }
  ]
};

export const ToolsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ToolTab>('scientific');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (val: string | number, key: string) => {
    navigator.clipboard.writeText(String(val));
    setCopiedKey(key);
    toast.success(`Copied ${val} to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // -------------------------------------------------------------
  // 1. Basic Calculator State
  // -------------------------------------------------------------
  const [basicDisplay, setBasicDisplay] = useState('0');
  const [basicPrev, setBasicPrev] = useState<number | null>(null);
  const [basicOp, setBasicOp] = useState<string | null>(null);
  const [basicClearOnNext, setBasicClearOnNext] = useState(false);
  const [basicHistory, setBasicHistory] = useState<string[]>([]);

  const handleBasicNum = (digit: string) => {
    if (basicClearOnNext || basicDisplay === '0') {
      setBasicDisplay(digit);
      setBasicClearOnNext(false);
    } else {
      setBasicDisplay(basicDisplay + digit);
    }
  };

  const handleBasicOp = (op: string) => {
    const current = parseFloat(basicDisplay);
    if (basicPrev === null) {
      setBasicPrev(current);
    } else if (basicOp) {
      const res = computeBasic(basicPrev, current, basicOp);
      setBasicPrev(res);
      setBasicDisplay(String(res));
      setBasicHistory((h) => [`${basicPrev} ${basicOp} ${current} = ${res}`, ...h.slice(0, 9)]);
    }
    setBasicOp(op);
    setBasicClearOnNext(true);
  };

  const computeBasic = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b === 0 ? 0 : a / b;
      default: return b;
    }
  };

  const handleBasicEquals = () => {
    if (basicPrev !== null && basicOp) {
      const current = parseFloat(basicDisplay);
      const res = computeBasic(basicPrev, current, basicOp);
      setBasicDisplay(String(res));
      setBasicHistory((h) => [`${basicPrev} ${basicOp} ${current} = ${res}`, ...h.slice(0, 9)]);
      setBasicPrev(null);
      setBasicOp(null);
      setBasicClearOnNext(true);
    }
  };

  const handleBasicClear = () => {
    setBasicDisplay('0');
    setBasicPrev(null);
    setBasicOp(null);
    setBasicClearOnNext(false);
  };

  // -------------------------------------------------------------
  // 2. Scientific Calculator State
  // -------------------------------------------------------------
  const [sciAngleMode, setSciAngleMode] = useState<'deg' | 'rad'>('deg');
  const [sciInput, setSciInput] = useState('');
  const [sciResult, setSciResult] = useState<string>('');

  const evalScientific = (expr: string) => {
    try {
      if (!expr.trim()) {
        setSciResult('');
        return;
      }

      // Safe evaluation of standard mathematical functions
      let sanitized = expr
        .replace(/π/g, 'Math.PI')
        .replace(/e(?![a-zA-Z])/g, 'Math.E')
        .replace(/\^/g, '**');

      if (sciAngleMode === 'deg') {
        sanitized = sanitized
          .replace(/sin\(([^)]+)\)/g, 'Math.sin(($1) * Math.PI / 180)')
          .replace(/cos\(([^)]+)\)/g, 'Math.cos(($1) * Math.PI / 180)')
          .replace(/tan\(([^)]+)\)/g, 'Math.tan(($1) * Math.PI / 180)');
      } else {
        sanitized = sanitized
          .replace(/sin\(/g, 'Math.sin(')
          .replace(/cos\(/g, 'Math.cos(')
          .replace(/tan\(/g, 'Math.tan(');
      }

      sanitized = sanitized
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/sqrt\(/g, 'Math.sqrt(');

      // Verify sanitized string contains ONLY numbers, operators, spaces, parentheses, decimal point, commas, and authorized Math properties/functions
      const testExpr = sanitized.replace(/Math\.(sin|cos|tan|log10|log|sqrt|PI|E|pow|abs)/g, '');
      if (!/^[\d\s+\-*/().,]+$/.test(testExpr)) {
        setSciResult('Error: Invalid Expression');
        return;
      }

      const val = Function(`"use strict"; return (${sanitized});`)();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        setSciResult(String(Math.round(val * 1e10) / 1e10));
      } else {
        setSciResult('Error');
      }
    } catch {
      setSciResult('Error: Invalid Expression');
    }
  };

  // -------------------------------------------------------------
  // 3. Financial Calculator State
  // -------------------------------------------------------------
  const [loanPrincipal, setLoanPrincipal] = useState(1000000);
  const [loanRate, setLoanRate] = useState(8.5);
  const [loanTenureYears, setLoanTenureYears] = useState(20);

  const loanResults = useMemo(() => {
    const P = loanPrincipal;
    const r = loanRate / 12 / 100;
    const n = loanTenureYears * 12;
    if (r === 0 || n === 0) {
      return { emi: 0, totalPayment: 0, totalInterest: 0 };
    }
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    const totalInterest = totalPayment - P;
    return {
      emi: Math.round(emi),
      totalPayment: Math.round(totalPayment),
      totalInterest: Math.round(totalInterest)
    };
  }, [loanPrincipal, loanRate, loanTenureYears]);

  // SIP Calculator
  const [sipMonthly, setSipMonthly] = useState(10000);
  const [sipRate, setSipRate] = useState(12);
  const [sipYears, setSipYears] = useState(10);

  const sipResults = useMemo(() => {
    const P = sipMonthly;
    const i = sipRate / 12 / 100;
    const n = sipYears * 12;
    const invested = P * n;
    const futureVal = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    return {
      invested: Math.round(invested),
      totalValue: Math.round(futureVal),
      returns: Math.round(futureVal - invested)
    };
  }, [sipMonthly, sipRate, sipYears]);

  // -------------------------------------------------------------
  // 4. Engineering Calculator State
  // -------------------------------------------------------------
  const [ohmVoltage, setOhmVoltage] = useState(12);
  const [ohmCurrent, setOhmCurrent] = useState(2);
  const ohmResistance = useMemo(() => {
    return ohmCurrent !== 0 ? (ohmVoltage / ohmCurrent).toFixed(2) : '0';
  }, [ohmVoltage, ohmCurrent]);
  const ohmPower = useMemo(() => {
    return (ohmVoltage * ohmCurrent).toFixed(2);
  }, [ohmVoltage, ohmCurrent]);

  // Voltage Divider
  const [vDivVin, setVDivVin] = useState(5);
  const [vDivR1, setVDivR1] = useState(10000);
  const [vDivR2, setVDivR2] = useState(10000);
  const vDivVout = useMemo(() => {
    const total = vDivR1 + vDivR2;
    return total > 0 ? ((vDivVin * vDivR2) / total).toFixed(3) : '0';
  }, [vDivVin, vDivR1, vDivR2]);

  // RC Time Constant
  const [rcRes, setRcRes] = useState(10000);
  const [rcCapMicro, setRcCapMicro] = useState(100);
  const rcTau = useMemo(() => {
    const cFarads = rcCapMicro * 1e-6;
    return (rcRes * cFarads).toFixed(4);
  }, [rcRes, rcCapMicro]);

  // -------------------------------------------------------------
  // 5. Statistics Calculator State
  // -------------------------------------------------------------
  const [statsInput, setStatsInput] = useState('12, 15, 23, 28, 34, 45, 56, 67, 78, 89');
  const statsResults = useMemo(() => {
    const nums = statsInput
      .split(/[,\s]+/)
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n));

    if (nums.length === 0) return null;
    const count = nums.length;
    const sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    const sorted = [...nums].sort((a, b) => a - b);
    const min = sorted[0] ?? 0;
    const max = sorted[sorted.length - 1] ?? 0;
    const range = max - min;
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
        : (sorted[mid] ?? 0);

    const variance =
      count > 1 ? nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (count - 1) : 0;
    const stdev = Math.sqrt(variance);

    return {
      count,
      sum: Math.round(sum * 1e4) / 1e4,
      mean: Math.round(mean * 1e4) / 1e4,
      median: Math.round(median * 1e4) / 1e4,
      min,
      max,
      range,
      variance: Math.round(variance * 1e4) / 1e4,
      stdev: Math.round(stdev * 1e4) / 1e4
    };
  }, [statsInput]);

  // -------------------------------------------------------------
  // 6. Universal Unit Converter State
  // -------------------------------------------------------------
  const [convCategory, setConvCategory] = useState<'length' | 'mass' | 'temperature' | 'digital' | 'pressure'>('length');
  const [convVal, setConvVal] = useState(100);
  const [convFrom, setConvFrom] = useState('m');
  const [convTo, setConvTo] = useState('ft');

  const convertedResult = useMemo(() => {
    const catList = UNIT_UNITS[convCategory] || UNIT_UNITS['length'] || [];
    if (!catList || catList.length === 0) return 0;
    const fallbackUnit = catList[0] || { label: '', toBase: (v: number) => v, fromBase: (v: number) => v };
    const fromUnit = catList.find((u) => u.label.includes(convFrom)) || fallbackUnit;
    const toUnit = catList.find((u) => u.label.includes(convTo)) || catList[1] || fallbackUnit;
    const baseVal = fromUnit.toBase(convVal);
    const targetVal = toUnit.fromBase(baseVal);
    return Math.round(targetVal * 1e6) / 1e6;
  }, [convCategory, convVal, convFrom, convTo]);

  // -------------------------------------------------------------
  // 7. Number Systems & Bitwise Converter State
  // -------------------------------------------------------------
  const [numSysDecimal, setNumSysDecimal] = useState(255);
  const numSysConversions = useMemo(() => {
    const n = Math.floor(Math.abs(numSysDecimal)) || 0;
    return {
      bin: n.toString(2),
      oct: n.toString(8),
      dec: n.toString(10),
      hex: n.toString(16).toUpperCase()
    };
  }, [numSysDecimal]);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-accent/10 text-accent border border-accent/20">
              <Calculator className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Tools Hub & Labs
              </h1>
              <p className="text-xs sm:text-sm text-foreground-muted">
                Precision scientific, engineering, and financial calculators integrated with DC Excel.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="accent" size="sm">
            Interactive Tools
          </Badge>
          <Badge variant="neutral" size="sm">
            100% Client-Side
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
        {[
          { id: 'scientific', label: 'Scientific Lab', icon: <Sparkles className="w-4 h-4" /> },
          { id: 'basic', label: 'Standard Calculator', icon: <Calculator className="w-4 h-4" /> },
          { id: 'finance', label: 'Finance & Loan Lab', icon: <DollarSign className="w-4 h-4" /> },
          { id: 'engineering', label: 'Engineering & Circuit Lab', icon: <Cpu className="w-4 h-4" /> },
          { id: 'statistics', label: 'Statistics Lab', icon: <BarChart2 className="w-4 h-4" /> },
          { id: 'converter', label: 'Universal Unit Converter', icon: <ArrowRightLeft className="w-4 h-4" /> },
          { id: 'number_systems', label: 'Binary & Hex Systems', icon: <Binary className="w-4 h-4" /> }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as ToolTab)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === t.id
                ? 'bg-accent text-zinc-950 shadow-xs'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-secondary'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Scientific Calculator */}
      {activeTab === 'scientific' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                Scientific Math Evaluator
              </h2>
              <div className="flex items-center gap-1 bg-surface-secondary p-1 rounded-lg border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setSciAngleMode('deg')}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                    sciAngleMode === 'deg' ? 'bg-accent text-zinc-950' : 'text-foreground-muted'
                  }`}
                >
                  DEG
                </button>
                <button
                  type="button"
                  onClick={() => setSciAngleMode('rad')}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                    sciAngleMode === 'rad' ? 'bg-accent text-zinc-950' : 'text-foreground-muted'
                  }`}
                >
                  RAD
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground-muted">Mathematical Expression</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={sciInput}
                  onChange={(e) => {
                    setSciInput(e.target.value);
                    evalScientific(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      evalScientific(sciInput);
                    }
                  }}
                  placeholder="e.g. sin(45) + sqrt(144) * log(100)"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface-secondary text-sm font-mono text-foreground focus:outline-none focus:border-accent"
                />
                <Button
                  variant="primary"
                  onClick={() => evalScientific(sciInput)}
                >
                  Calculate
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSciInput('');
                    setSciResult('');
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Scientific Function Buttons */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {['sin(', 'cos(', 'tan(', 'log(', 'ln(', 'sqrt(', 'π', 'e', '^2', '(', ')', '/'].map(
                (fn) => (
                  <button
                    key={fn}
                    type="button"
                    onClick={() => {
                      const next = sciInput + fn;
                      setSciInput(next);
                      evalScientific(next);
                    }}
                    className="px-3 py-2 rounded-lg border border-border bg-surface-secondary hover:bg-surface-elevated hover:border-accent/40 text-xs font-mono font-semibold text-foreground transition-all"
                  >
                    {fn}
                  </button>
                )
              )}
            </div>

            {/* Result Display */}
            <div className="p-4 rounded-xl border border-border bg-surface-secondary flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle block">
                  Computed Output
                </span>
                <span className="text-2xl font-bold font-mono text-accent">
                  {sciResult || '0'}
                </span>
              </div>
              {sciResult && (
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={copiedKey === 'sci' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  onClick={() => handleCopy(sciResult, 'sci')}
                >
                  {copiedKey === 'sci' ? 'Copied' : 'Copy Result'}
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Supported Functions</h3>
            <ul className="text-xs text-foreground-muted space-y-2 list-disc list-inside">
              <li><code className="text-accent">sin(x)</code>, <code className="text-accent">cos(x)</code>, <code className="text-accent">tan(x)</code></li>
              <li><code className="text-accent">log(x)</code> (base 10) & <code className="text-accent">ln(x)</code> (natural log)</li>
              <li><code className="text-accent">sqrt(x)</code>, <code className="text-accent">^</code> (power)</li>
              <li>Constants: <code className="text-accent">π</code> (3.14159) and <code className="text-accent">e</code> (2.71828)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 2: Standard Calculator */}
      {activeTab === 'basic' && (
        <div className="max-w-md mx-auto rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xs">
          <div className="p-4 rounded-xl border border-border bg-surface-secondary text-right">
            <div className="text-xs font-mono text-foreground-muted min-h-[16px]">
              {basicPrev !== null && basicOp ? `${basicPrev} ${basicOp}` : ''}
            </div>
            <div className="text-3xl font-mono font-bold text-foreground truncate">
              {basicDisplay}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-sm font-semibold">
            {['C', '±', '%', '÷'].map((btn) => (
              <button
                key={btn}
                type="button"
                onClick={() => {
                  if (btn === 'C') handleBasicClear();
                  if (btn === '÷') handleBasicOp('÷');
                }}
                className="p-3 rounded-xl bg-surface-secondary hover:bg-surface-elevated border border-border text-foreground transition-all"
              >
                {btn}
              </button>
            ))}
            {['7', '8', '9', '×'].map((btn) => (
              <button
                key={btn}
                type="button"
                onClick={() => (btn === '×' ? handleBasicOp('×') : handleBasicNum(btn))}
                className={`p-3 rounded-xl border border-border transition-all ${
                  btn === '×' ? 'bg-surface-secondary text-accent' : 'bg-surface hover:bg-surface-elevated text-foreground'
                }`}
              >
                {btn}
              </button>
            ))}
            {['4', '5', '6', '-'].map((btn) => (
              <button
                key={btn}
                type="button"
                onClick={() => (btn === '-' ? handleBasicOp('-') : handleBasicNum(btn))}
                className={`p-3 rounded-xl border border-border transition-all ${
                  btn === '-' ? 'bg-surface-secondary text-accent' : 'bg-surface hover:bg-surface-elevated text-foreground'
                }`}
              >
                {btn}
              </button>
            ))}
            {['1', '2', '3', '+'].map((btn) => (
              <button
                key={btn}
                type="button"
                onClick={() => (btn === '+' ? handleBasicOp('+') : handleBasicNum(btn))}
                className={`p-3 rounded-xl border border-border transition-all ${
                  btn === '+' ? 'bg-surface-secondary text-accent' : 'bg-surface hover:bg-surface-elevated text-foreground'
                }`}
              >
                {btn}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleBasicNum('0')}
              className="col-span-2 p-3 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-foreground transition-all text-left px-5"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => {
                if (!basicDisplay.includes('.')) handleBasicNum('.');
              }}
              className="p-3 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-foreground transition-all"
            >
              .
            </button>
            <button
              type="button"
              onClick={handleBasicEquals}
              className="p-3 rounded-xl bg-accent text-zinc-950 font-bold hover:bg-accent-hover transition-all"
            >
              =
            </button>
          </div>

          {basicHistory.length > 0 && (
            <div className="pt-2 border-t border-border space-y-1">
              <span className="text-[10px] uppercase font-semibold text-foreground-subtle tracking-wider">
                Recent Calculations
              </span>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {basicHistory.map((item, idx) => (
                  <div key={idx} className="text-xs font-mono text-foreground-muted flex justify-between">
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Finance & Loan Lab */}
      {activeTab === 'finance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Loan / EMI Calculator */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-5 shadow-xs">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent" />
              EMI & Loan Amortization Calculator
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-foreground-muted block mb-1">
                  Principal Amount: ₹{loanPrincipal.toLocaleString('en-IN')}
                </label>
                <input
                  type="range"
                  min={50000}
                  max={10000000}
                  step={50000}
                  value={loanPrincipal}
                  onChange={(e) => setLoanPrincipal(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground-muted block mb-1">
                  Interest Rate (% p.a.): {loanRate}%
                </label>
                <input
                  type="range"
                  min={5}
                  max={20}
                  step={0.1}
                  value={loanRate}
                  onChange={(e) => setLoanRate(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground-muted block mb-1">
                  Tenure: {loanTenureYears} Years ({loanTenureYears * 12} Months)
                </label>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={loanTenureYears}
                  onChange={(e) => setLoanTenureYears(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl border border-border bg-surface-secondary text-center">
              <div>
                <div className="text-[10px] uppercase font-bold text-foreground-subtle">Monthly EMI</div>
                <div className="text-base font-bold text-accent font-mono">₹{loanResults.emi.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-foreground-subtle">Total Interest</div>
                <div className="text-base font-bold text-foreground font-mono">₹{loanResults.totalInterest.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-foreground-subtle">Total Amount</div>
                <div className="text-base font-bold text-foreground font-mono">₹{loanResults.totalPayment.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* SIP Investment Calculator */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-5 shadow-xs">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-accent" />
              SIP Compound Investment Lab
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-foreground-muted block mb-1">
                  Monthly SIP Amount: ₹{sipMonthly.toLocaleString('en-IN')}
                </label>
                <input
                  type="range"
                  min={1000}
                  max={100000}
                  step={1000}
                  value={sipMonthly}
                  onChange={(e) => setSipMonthly(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground-muted block mb-1">
                  Expected Return (% p.a.): {sipRate}%
                </label>
                <input
                  type="range"
                  min={6}
                  max={30}
                  step={0.5}
                  value={sipRate}
                  onChange={(e) => setSipRate(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground-muted block mb-1">
                  Duration: {sipYears} Years
                </label>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={sipYears}
                  onChange={(e) => setSipYears(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl border border-border bg-surface-secondary text-center">
              <div>
                <div className="text-[10px] uppercase font-bold text-foreground-subtle">Invested</div>
                <div className="text-base font-bold text-foreground font-mono">₹{sipResults.invested.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-foreground-subtle">Estimated Wealth</div>
                <div className="text-base font-bold text-accent font-mono">₹{sipResults.totalValue.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-foreground-subtle">Gains</div>
                <div className="text-base font-bold text-emerald-400 font-mono">₹{sipResults.returns.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Engineering & Circuit Lab */}
      {activeTab === 'engineering' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ohm's Law */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Cpu className="w-4 h-4 text-accent" />
              Ohm&apos;s Law Calculator
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-foreground-muted block mb-1">Voltage (V)</label>
                <input
                  type="number"
                  value={ohmVoltage}
                  onChange={(e) => setOhmVoltage(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface-secondary font-mono"
                />
              </div>
              <div>
                <label className="text-foreground-muted block mb-1">Current (I in Amperes)</label>
                <input
                  type="number"
                  value={ohmCurrent}
                  onChange={(e) => setOhmCurrent(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface-secondary font-mono"
                />
              </div>
              <div className="p-3 rounded-lg bg-surface-secondary border border-border space-y-1">
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Resistance (R = V/I):</span>
                  <span className="font-mono font-bold text-accent">{ohmResistance} Ω</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Power (P = V×I):</span>
                  <span className="font-mono font-bold text-foreground">{ohmPower} W</span>
                </div>
              </div>
            </div>
          </div>

          {/* Voltage Divider */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              Voltage Divider
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-foreground-muted block mb-1">Input Voltage (Vin)</label>
                <input
                  type="number"
                  value={vDivVin}
                  onChange={(e) => setVDivVin(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface-secondary font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-foreground-muted block mb-1">R1 (Ω)</label>
                  <input
                    type="number"
                    value={vDivR1}
                    onChange={(e) => setVDivR1(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface-secondary font-mono"
                  />
                </div>
                <div>
                  <label className="text-foreground-muted block mb-1">R2 (Ω)</label>
                  <input
                    type="number"
                    value={vDivR2}
                    onChange={(e) => setVDivR2(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface-secondary font-mono"
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface-secondary border border-border flex justify-between items-center">
                <span className="text-foreground-muted">Vout = Vin × R2/(R1+R2):</span>
                <span className="font-mono font-bold text-accent text-base">{vDivVout} V</span>
              </div>
            </div>
          </div>

          {/* RC Time Constant */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-accent" />
              RC Time Constant (τ)
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-foreground-muted block mb-1">Resistance (R in Ω)</label>
                <input
                  type="number"
                  value={rcRes}
                  onChange={(e) => setRcRes(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface-secondary font-mono"
                />
              </div>
              <div>
                <label className="text-foreground-muted block mb-1">Capacitance (C in μF)</label>
                <input
                  type="number"
                  value={rcCapMicro}
                  onChange={(e) => setRcCapMicro(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface-secondary font-mono"
                />
              </div>
              <div className="p-3 rounded-lg bg-surface-secondary border border-border flex justify-between items-center">
                <span className="text-foreground-muted">Tau (τ = R × C):</span>
                <span className="font-mono font-bold text-accent text-base">{rcTau} s</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Statistics Lab */}
      {activeTab === 'statistics' && (
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-5 shadow-xs">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-accent" />
            Descriptive Statistics Lab
          </h2>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground-muted">
              Input Numbers (separated by commas or spaces)
            </label>
            <textarea
              rows={3}
              value={statsInput}
              onChange={(e) => setStatsInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary text-sm font-mono text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          {statsResults && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Count (N)', val: statsResults.count },
                { label: 'Sum', val: statsResults.sum },
                { label: 'Mean', val: statsResults.mean },
                { label: 'Median', val: statsResults.median },
                { label: 'Min', val: statsResults.min },
                { label: 'Max', val: statsResults.max },
                { label: 'Range', val: statsResults.range },
                { label: 'Variance', val: statsResults.variance },
                { label: 'Std Deviation (s)', val: statsResults.stdev }
              ].map((s) => (
                <div key={s.label} className="p-3 rounded-xl border border-border bg-surface-secondary text-center">
                  <div className="text-[10px] uppercase font-bold text-foreground-subtle">{s.label}</div>
                  <div className="text-base font-bold text-accent font-mono mt-0.5">{s.val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Universal Unit Converter */}
      {activeTab === 'converter' && (
        <div className="max-w-xl mx-auto rounded-2xl border border-border bg-surface p-6 space-y-5 shadow-xs">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-accent" />
            Universal Unit Converter
          </h2>

          <div className="flex gap-2 pb-2 overflow-x-auto">
            {(['length', 'mass', 'temperature', 'digital', 'pressure'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setConvCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  convCategory === cat ? 'bg-accent text-zinc-950' : 'bg-surface-secondary text-foreground-muted'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-foreground-muted">From Unit</label>
              <select
                value={convFrom}
                onChange={(e) => setConvFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary text-xs font-semibold"
              >
                {(UNIT_UNITS[convCategory] || []).map((u) => (
                  <option key={u.label} value={u.label}>
                    {u.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={convVal}
                onChange={(e) => setConvVal(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary text-sm font-mono mt-2"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-foreground-muted">To Unit</label>
              <select
                value={convTo}
                onChange={(e) => setConvTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary text-xs font-semibold"
              >
                {(UNIT_UNITS[convCategory] || []).map((u) => (
                  <option key={u.label} value={u.label}>
                    {u.label}
                  </option>
                ))}
              </select>
              <div className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary text-base font-bold font-mono text-accent mt-2 flex items-center justify-between">
                <span>{convertedResult}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(convertedResult, 'conv')}
                  className="text-xs text-foreground-muted hover:text-foreground"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Binary & Hex Systems */}
      {activeTab === 'number_systems' && (
        <div className="max-w-xl mx-auto rounded-2xl border border-border bg-surface p-6 space-y-5 shadow-xs">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Binary className="w-5 h-5 text-accent" />
            Number System & Radix Converter
          </h2>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground-muted">Decimal Value</label>
            <input
              type="number"
              value={numSysDecimal}
              onChange={(e) => setNumSysDecimal(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary text-base font-mono font-bold text-foreground"
            />
          </div>

          <div className="space-y-3 pt-2">
            {[
              { label: 'Binary (Base 2)', val: numSysConversions.bin },
              { label: 'Octal (Base 8)', val: numSysConversions.oct },
              { label: 'Decimal (Base 10)', val: numSysConversions.dec },
              { label: 'Hexadecimal (Base 16)', val: numSysConversions.hex }
            ].map((sys) => (
              <div
                key={sys.label}
                className="p-3 rounded-xl border border-border bg-surface-secondary flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle block">
                    {sys.label}
                  </span>
                  <span className="text-sm font-mono font-bold text-accent">{sys.val}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(sys.val, sys.label)}
                >
                  Copy
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
