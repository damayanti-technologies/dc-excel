import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Scissors,
  Copy,
  Columns
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/stores/toast-store';

export const DataCenterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cleaner' | 'split' | 'stats'>('cleaner');

  // Cleaner State
  const [cleanInput, setCleanInput] = useState(
    '   John Doe    ,   $45,000   ,   2024/01/15   \n  Jane Smith  ,   $62,500   ,   2024/02/20  '
  );
  const [cleanOptions, setCleanOptions] = useState({
    trim: true,
    stripSpecial: false,
    toUppercase: false,
    toLowercase: false,
    removeCommas: false
  });

  const cleanedOutput = useMemo(() => {
    let lines = cleanInput.split('\n');
    lines = lines.map((line) => {
      let l = line;
      if (cleanOptions.trim) {
        l = l.replace(/\s+/g, ' ').trim();
      }
      if (cleanOptions.removeCommas) {
        l = l.replace(/\$/g, '').replace(/,/g, '');
      }
      if (cleanOptions.toUppercase) {
        l = l.toUpperCase();
      }
      if (cleanOptions.toLowercase) {
        l = l.toLowerCase();
      }
      return l;
    });
    return lines.join('\n');
  }, [cleanInput, cleanOptions]);

  // Split / Text to Columns State
  const [splitInput, setSplitInput] = useState('Alpha,100,True\nBeta,200,False\nGamma,300,True');
  const [splitDelimiter, setSplitDelimiter] = useState(',');
  const splitRows = useMemo(() => {
    return splitInput
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.split(splitDelimiter));
  }, [splitInput, splitDelimiter]);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-accent/10 text-accent border border-accent/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Data Center & Cleaning Lab
              </h1>
              <p className="text-xs sm:text-sm text-foreground-muted">
                Sanitize, normalize, split delimiters, and format data for accurate spreadsheet processing.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="accent" size="sm">
            Client-Side Transformer
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[
          { id: 'cleaner', label: 'Data Sanitizer & Trimmer', icon: <Scissors className="w-4 h-4" /> },
          { id: 'split', label: 'Delimited Text to Columns', icon: <Columns className="w-4 h-4" /> }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as 'cleaner' | 'split')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
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

      {/* Cleaner View */}
      {activeTab === 'cleaner' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-foreground">Raw Unclean Input</h2>
            <textarea
              rows={8}
              value={cleanInput}
              onChange={(e) => setCleanInput(e.target.value)}
              placeholder="Paste raw table data or text here..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-secondary text-xs font-mono text-foreground focus:outline-none focus:border-accent"
            />

            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle block">
                Cleaning Operations
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-foreground">
                  <input
                    type="checkbox"
                    checked={cleanOptions.trim}
                    onChange={(e) => setCleanOptions({ ...cleanOptions, trim: e.target.checked })}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Trim excessive whitespace</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-foreground">
                  <input
                    type="checkbox"
                    checked={cleanOptions.removeCommas}
                    onChange={(e) => setCleanOptions({ ...cleanOptions, removeCommas: e.target.checked })}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Strip currency & commas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-foreground">
                  <input
                    type="checkbox"
                    checked={cleanOptions.toUppercase}
                    onChange={(e) =>
                      setCleanOptions({ ...cleanOptions, toUppercase: e.target.checked, toLowercase: false })
                    }
                    className="accent-emerald-500 rounded"
                  />
                  <span>Convert to UPPERCASE</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-foreground">
                  <input
                    type="checkbox"
                    checked={cleanOptions.toLowercase}
                    onChange={(e) =>
                      setCleanOptions({ ...cleanOptions, toLowercase: e.target.checked, toUppercase: false })
                    }
                    className="accent-emerald-500 rounded"
                  />
                  <span>Convert to lowercase</span>
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">Cleaned Output</h2>
                <Button
                  size="xs"
                  variant="outline"
                  leftIcon={<Copy className="w-3.5 h-3.5" />}
                  onClick={() => {
                    navigator.clipboard.writeText(cleanedOutput);
                    toast.success('Cleaned data copied to clipboard');
                  }}
                >
                  Copy Cleaned
                </Button>
              </div>
              <textarea
                readOnly
                rows={8}
                value={cleanedOutput}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-secondary text-xs font-mono text-accent focus:outline-none"
              />
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-surface-secondary flex items-center gap-2 text-xs text-foreground-muted">
              <Sparkles className="w-4 h-4 text-accent shrink-0" />
              <span>Ready to paste directly into DC Excel cells without formatting errors.</span>
            </div>
          </div>
        </div>
      )}

      {/* Split Delimiters View */}
      {activeTab === 'split' && (
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">Split Text into Columns</h2>
              <p className="text-xs text-foreground-muted">
                Preview how delimited text splits into structured rows and columns.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-foreground-muted">Delimiter:</span>
              {[';', ',', '\t', ' '].map((delim) => (
                <button
                  key={delim}
                  type="button"
                  onClick={() => setSplitDelimiter(delim)}
                  className={`px-2.5 py-1 rounded-lg border border-border font-mono font-semibold transition-all ${
                    splitDelimiter === delim ? 'bg-accent text-zinc-950' : 'bg-surface-secondary text-foreground'
                  }`}
                >
                  {delim === '\t' ? 'Tab' : delim === ' ' ? 'Space' : delim}
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={4}
            value={splitInput}
            onChange={(e) => setSplitInput(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface-secondary text-xs font-mono text-foreground focus:outline-none focus:border-accent"
          />

          <div className="overflow-x-auto rounded-xl border border-border bg-surface-secondary">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-elevated border-b border-border text-foreground-subtle uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-2 w-12">#</th>
                  {splitRows[0]?.map((_, colIdx) => (
                    <th key={colIdx} className="px-4 py-2">
                      Col {String.fromCharCode(65 + colIdx)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {splitRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-surface-elevated/50 font-mono">
                    <td className="px-4 py-2 font-bold text-foreground-subtle">{rowIdx + 1}</td>
                    {row.map((cell, colIdx) => (
                      <td key={colIdx} className="px-4 py-2 text-foreground">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
