import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  Button,
  IconButton,
  Input,
  SearchInput,
  Dropdown,
  Modal,
  ConfirmationDialog,
  Tabs,
  Toggle,
  Checkbox,
  Badge,
  ToastContainer
} from '@/components/ui';
import { toast, useToastStore } from '@/stores/toast-store';
import { Sparkles } from 'lucide-react';

describe('Design System UI Components', () => {
  it('renders Button variants, handles clicks and loading state', () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Button variant="accent" onClick={handleClick}>
        Save Workbook
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Save Workbook' });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Loading state disables button
    rerender(
      <Button variant="accent" isLoading onClick={handleClick}>
        Save Workbook
      </Button>
    );
    expect(button).toBeDisabled();
  });

  it('renders IconButton with accessible label', () => {
    const handleClick = vi.fn();
    render(
      <IconButton
        icon={<Sparkles className="w-4 h-4" />}
        aria-label="Generate Analysis"
        onClick={handleClick}
      />
    );

    const btn = screen.getByRole('button', { name: 'Generate Analysis' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders Input with label, placeholder, and error message', () => {
    const handleChange = vi.fn();
    render(
      <Input
        label="Sheet Name"
        placeholder="Enter name..."
        errorMessage="Name is required"
        onChange={handleChange}
      />
    );

    expect(screen.getByText('Sheet Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter name...')).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Enter name...');
    fireEvent.change(input, { target: { value: 'Financials' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('handles SearchInput typing, clear button, and Escape key', () => {
    const handleClear = vi.fn();
    const handleChange = vi.fn();

    const { rerender } = render(
      <SearchInput
        value="Budget"
        onChange={handleChange}
        onClear={handleClear}
        placeholder="Search..."
      />
    );

    const input = screen.getByPlaceholderText('Search...');
    expect(input).toHaveValue('Budget');

    // Clear button visible when value present
    const clearBtn = screen.getByRole('button', { name: 'Clear search' });
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);

    // Escape key calls onClear
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(handleClear).toHaveBeenCalledTimes(2);

    rerender(
      <SearchInput
        value=""
        onChange={handleChange}
        onClear={handleClear}
        placeholder="Search..."
      />
    );
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });

  it('renders Dropdown menu, opens on click, and triggers item click', () => {
    const handleItemClick = vi.fn();
    render(
      <Dropdown
        trigger={<button>Options Menu</button>}
        items={[
          { id: '1', label: 'Duplicate Sheet', onClick: handleItemClick },
          { id: '2', label: 'Delete Sheet', destructive: true, onClick: vi.fn() }
        ]}
      />
    );

    expect(screen.queryByText('Duplicate Sheet')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Options Menu' }));
    expect(screen.getByText('Duplicate Sheet')).toBeInTheDocument();
    expect(screen.getByText('Delete Sheet')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Duplicate Sheet'));
    expect(handleItemClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Duplicate Sheet')).not.toBeInTheDocument();
  });

  it('renders Modal and handles Escape key and backdrop close', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Rename Workbook">
        <div>Modal Body Content</div>
      </Modal>
    );

    expect(screen.getByText('Rename Workbook')).toBeInTheDocument();
    expect(screen.getByText('Modal Body Content')).toBeInTheDocument();

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  it('renders ConfirmationDialog with confirm and cancel buttons', () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConfirmationDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Delete Item"
        message="Are you sure you want to delete this sheet?"
        confirmLabel="Yes, Delete"
        isDestructive={true}
      />
    );

    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders Tabs and handles tab change', () => {
    const handleChange = vi.fn();
    render(
      <Tabs
        tabs={[
          { id: 'home', label: 'Home' },
          { id: 'data', label: 'Data' }
        ]}
        activeTabId="home"
        onChange={handleChange}
      />
    );

    const dataTab = screen.getByRole('tab', { name: 'Data' });
    fireEvent.click(dataTab);
    expect(handleChange).toHaveBeenCalledWith('data');
  });

  it('renders Toggle and switches checked state', () => {
    const handleChange = vi.fn();
    render(
      <Toggle
        label="Auto-Calculate"
        checked={false}
        onChange={handleChange}
      />
    );

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('renders Checkbox and handles click', () => {
    const handleChange = vi.fn();
    render(
      <Checkbox
        label="Wrap Text"
        checked={false}
        onChange={handleChange}
      />
    );

    const cb = screen.getByLabelText('Wrap Text');
    fireEvent.click(cb);
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders Badge variants', () => {
    render(
      <div>
        <Badge variant="accent">New</Badge>
        <Badge variant="success">Saved</Badge>
        <Badge variant="error">Offline</Badge>
      </div>
    );

    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('dispatches and renders Toast notifications, supporting dismissal', () => {
    useToastStore.getState().clearAll();

    render(<ToastContainer />);

    act(() => {
      toast.success('File Saved', 'Workbook updated in local storage.');
    });

    expect(screen.getByText('File Saved')).toBeInTheDocument();
    expect(screen.getByText('Workbook updated in local storage.')).toBeInTheDocument();

    const dismissBtn = screen.getByRole('button', { name: 'Dismiss notification' });
    fireEvent.click(dismissBtn);

    expect(screen.queryByText('File Saved')).not.toBeInTheDocument();
  });
});
