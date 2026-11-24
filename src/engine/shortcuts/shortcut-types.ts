export type ShortcutCategory =
  | 'workbook'
  | 'editing'
  | 'formatting'
  | 'navigation'
  | 'data'
  | 'view'
  | 'help';

export interface ShortcutDefinition {
  id: string;
  label: string;
  category: ShortcutCategory;
  key: string;
  ctrlOrMeta?: boolean;
  shift?: boolean;
  alt?: boolean;
  display: string;
  description: string;
}

export interface ShortcutMatchParams {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}
