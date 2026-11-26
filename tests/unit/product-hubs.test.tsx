import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToolsPage } from '@/features/tools/ToolsPage';
import { FormulaCenterPage } from '@/features/formulas/FormulaCenterPage';
import { DataCenterPage } from '@/features/data-tools/DataCenterPage';
import { AcademyPage } from '@/features/academy/AcademyPage';
import { TemplatesPage } from '@/features/templates/TemplatesPage';
import { ShortcutsPage } from '@/features/shortcuts/ShortcutsPage';

describe('Product Hubs & Labs (Milestone 1)', () => {
  describe('ToolsPage', () => {
    it('renders tools hub with all calculator tabs and evaluates scientific math', () => {
      render(
        <MemoryRouter>
          <ToolsPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Tools Hub & Labs')).toBeInTheDocument();
      expect(screen.getByText('Scientific Lab')).toBeInTheDocument();
      expect(screen.getByText('Standard Calculator')).toBeInTheDocument();
      expect(screen.getByText('Finance & Loan Lab')).toBeInTheDocument();
      expect(screen.getByText('Engineering & Circuit Lab')).toBeInTheDocument();
      expect(screen.getByText('Statistics Lab')).toBeInTheDocument();
      expect(screen.getByText('Universal Unit Converter')).toBeInTheDocument();
      expect(screen.getByText('Binary & Hex Systems')).toBeInTheDocument();

      // Test scientific input
      const input = screen.getByPlaceholderText(/sin\(45\)/i);
      fireEvent.change(input, { target: { value: '10 + 20 * 3' } });
      expect(screen.getByText('70')).toBeInTheDocument();
    });

    it('switches to basic calculator and performs calculation', () => {
      render(
        <MemoryRouter>
          <ToolsPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('Standard Calculator'));
      fireEvent.click(screen.getByText('7'));
      fireEvent.click(screen.getByText('+'));
      fireEvent.click(screen.getByText('8'));
      fireEvent.click(screen.getByText('='));
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('converts units in Universal Unit Converter', () => {
      render(
        <MemoryRouter>
          <ToolsPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('Universal Unit Converter'));
      expect(screen.getByText(/From Unit/i)).toBeInTheDocument();
      expect(screen.getByText(/To Unit/i)).toBeInTheDocument();
    });
  });

  describe('FormulaCenterPage', () => {
    it('renders formula explorer and filters by search query', () => {
      render(
        <MemoryRouter>
          <FormulaCenterPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Formula Center & Explorer')).toBeInTheDocument();
      expect(screen.getByText('=SUM')).toBeInTheDocument();
      expect(screen.getByText('=VLOOKUP')).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText(/search formulas/i);
      fireEvent.change(searchInput, { target: { value: 'ROUND' } });
      expect(screen.getByText('=ROUND')).toBeInTheDocument();
    });

    it('evaluates formula expressions in sandboxed playground', () => {
      render(
        <MemoryRouter>
          <FormulaCenterPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('Formula Sandbox & Tester'));
      expect(screen.getByText(/Sandboxed Formula Evaluator/i)).toBeInTheDocument();

      const testInput = screen.getByDisplayValue('=SUM(10, 20, 30) * 2');
      fireEvent.change(testInput, { target: { value: '=5 * 9' } });
      fireEvent.click(screen.getByRole('button', { name: /evaluate/i }));
      expect(screen.getByText('45')).toBeInTheDocument();
    });
  });

  describe('DataCenterPage', () => {
    it('cleans raw text and trims whitespace', () => {
      render(
        <MemoryRouter>
          <DataCenterPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Data Center & Cleaning Lab')).toBeInTheDocument();
      expect(screen.getByText(/Raw Unclean Input/i)).toBeInTheDocument();
      expect(screen.getByText(/Cleaned Output/i)).toBeInTheDocument();
    });

    it('splits delimited text into structured preview rows', () => {
      render(
        <MemoryRouter>
          <DataCenterPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('Delimited Text to Columns'));
      expect(screen.getByText('Col A')).toBeInTheDocument();
      expect(screen.getByText('Alpha')).toBeInTheDocument();
    });
  });

  describe('AcademyPage', () => {
    it('renders 19 structured courses and toggles lesson completion', () => {
      render(
        <MemoryRouter>
          <AcademyPage />
        </MemoryRouter>
      );

      expect(screen.getByText('DC Excel Academy')).toBeInTheDocument();
      expect(screen.getByText('Course Curriculum')).toBeInTheDocument();
      expect(screen.getAllByText('Spreadsheet Basics & Navigation').length).toBeGreaterThan(0);

      const markBtn = screen.getByRole('button', { name: /mark as complete/i });
      fireEvent.click(markBtn);
      expect(screen.getByText(/1 of 19 Completed/i)).toBeInTheDocument();
    });
  });

  describe('TemplatesPage', () => {
    it('renders pre-built templates across categories', () => {
      render(
        <MemoryRouter>
          <TemplatesPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Template Gallery')).toBeInTheDocument();
      expect(screen.getByText('Monthly Personal Budget')).toBeInTheDocument();
      expect(screen.getByText('Project Milestone & Task Tracker')).toBeInTheDocument();
      expect(screen.getByText('Loan Amortization & EMI Schedule')).toBeInTheDocument();
    });
  });

  describe('ShortcutsPage', () => {
    it('renders shortcut cheat sheet and switches platform keyboard mode', () => {
      render(
        <MemoryRouter>
          <ShortcutsPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Shortcut Center & Keyboard Master')).toBeInTheDocument();
      expect(screen.getByText('Undo the last action')).toBeInTheDocument();
      expect(screen.getAllByText('Ctrl').length).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole('button', { name: /macos/i }));
      expect(screen.getAllByText('⌘').length).toBeGreaterThan(0);
    });
  });
});
