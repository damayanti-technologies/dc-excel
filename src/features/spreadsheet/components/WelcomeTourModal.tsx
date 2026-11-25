import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  FileSpreadsheet,
  Upload,
  Calculator,
  BarChart2,
  ShieldCheck,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useUIPreferencesStore } from '@/stores/ui-preferences-store';

interface WelcomeTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewWorkbook?: () => void;
  onImportFile?: () => void;
}

export const WelcomeTourModal: React.FC<WelcomeTourModalProps> = ({
  isOpen,
  onClose,
  onNewWorkbook,
  onImportFile
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const preferences = useUIPreferencesStore((s) => s.preferences);
  const updatePreferences = useUIPreferencesStore((s) => s.updatePreferences);

  const slides = [
    {
      title: 'Welcome to DC Excel',
      subtitle: 'The modern, 100% local-first spreadsheet engineered for performance, precision, and privacy.',
      icon: <FileSpreadsheet className="w-12 h-12 text-accent" />,
      features: [
        { label: 'Zero Cloud Dependency', desc: 'Your data never leaves your browser; saved safely into local IndexedDB.' },
        { label: 'Blazing Fast Virtualization', desc: 'Scroll smoothly across thousands of rows and columns with sub-millisecond response.' },
        { label: 'Excel & CSV Interoperable', desc: 'Import and export Microsoft Excel (.xlsx) and RFC 4180 CSV files seamlessly.' }
      ]
    },
    {
      title: 'Formulas & Calculation Engine',
      subtitle: 'Built-in formula compiler with dependency graph tracking and instant re-calculation.',
      icon: <Calculator className="w-12 h-12 text-accent" />,
      features: [
        { label: 'Over 80+ Spreadsheet Functions', desc: 'SUM, AVERAGE, VLOOKUP, XLOOKUP, INDEX, MATCH, IF, COUNTIF, and more.' },
        { label: 'Intelligent Formula Autocomplete', desc: 'Interactive suggestion popover with function signatures and argument assistance.' },
        { label: 'Multi-Cell Range Calculations', desc: 'Reference cells across rows, columns, and custom Named Ranges effortlessly.' }
      ]
    },
    {
      title: 'Styling, Data Tools & Charts',
      subtitle: 'Professional typography, borders, conditional formatting, and Apache ECharts integration.',
      icon: <BarChart2 className="w-12 h-12 text-accent" />,
      features: [
        { label: 'Cell Formatting & Number Formats', desc: 'Currency, percentages, accounting, dates, borders, and custom fill colors.' },
        { label: 'Advanced Data Toolkit', desc: 'Multi-level sorting, column filtering, deduplication, and pivot tables.' },
        { label: 'Interactive Data Visualizations', desc: 'Bar, line, pie, area, and scatter charts synchronized with live grid data.' }
      ]
    },
    {
      title: 'Autosave, Versioning & Reliability',
      subtitle: 'Continuous data protection ensuring your work is never lost to accidents or power loss.',
      icon: <ShieldCheck className="w-12 h-12 text-accent" />,
      features: [
        { label: 'Serialized Autosave Queue', desc: 'Debounced background saving with revision sequencing and write locks.' },
        { label: 'Version History & Checkpoints', desc: 'Inspect snapshots over time with pre-restore safety backups.' },
        { label: 'Portable .omni Archives', desc: 'Backup and restore entire workbooks in structured, self-contained archives.' }
      ]
    }
  ];

  const handleFinish = () => {
    void updatePreferences({
      applicationPreferences: {
        ...preferences.applicationPreferences,
        hasSeenOnboarding: true
      }
    });
    onClose();
  };

  const slide = slides[currentSlide]!;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleFinish}
      title="DC Excel Quick Tour"
      className="max-w-xl"
    >
      <div className="space-y-6">
        {/* Slide Header & Graphic */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="p-3 bg-surface-secondary rounded-2xl border border-border shadow-xs">
            {slide.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{slide.title}</h3>
            <p className="text-xs text-foreground-muted max-w-md mx-auto mt-1 leading-relaxed">
              {slide.subtitle}
            </p>
          </div>
        </div>

        {/* Feature Highlights Checklist */}
        <div className="space-y-2.5 bg-surface-secondary/50 border border-border rounded-xl p-4">
          {slide.features.map((feat, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
              <div>
                <span className="font-semibold text-foreground">{feat.label}: </span>
                <span className="text-foreground-muted">{feat.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Launch Buttons (Last Slide) */}
        {currentSlide === slides.length - 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            {onNewWorkbook && (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  handleFinish();
                  onNewWorkbook();
                }}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Create New Workbook</span>
              </Button>
            )}
            {onImportFile && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleFinish();
                  onImportFile();
                }}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Import File</span>
              </Button>
            )}
          </div>
        )}

        {/* Carousel Dots & Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentSlide(i)}
                title={`Go to slide ${i + 1}`}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                  i === currentSlide ? 'w-6 bg-accent' : 'w-1.5 bg-border hover:bg-foreground-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentSlide > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCurrentSlide((p) => p - 1)}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
            )}

            {currentSlide < slides.length - 1 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setCurrentSlide((p) => p + 1)}
                className="flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleFinish}
              >
                Get Started
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
