/**
 * Base Application Error
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly originalError?: unknown;

  constructor(message: string, code = 'APP_ERROR', isOperational = true, originalError?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.isOperational = isOperational;
    this.originalError = originalError;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Storage failure errors (IndexedDB connection or query failure)
 */
export class StorageError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'STORAGE_ERROR', true, originalError);
  }
}

/**
 * Storage quota exceeded errors (Browser storage full)
 */
export class QuotaExceededError extends AppError {
  constructor(message = 'Browser storage quota has been exceeded.', originalError?: unknown) {
    super(message, 'QUOTA_EXCEEDED', true, originalError);
  }
}

/**
 * Workbook or Sheet schema corruption errors
 */
export class WorkbookCorruptedError extends AppError {
  public readonly workbookId?: string;

  constructor(message: string, workbookId?: string, originalError?: unknown) {
    super(message, 'WORKBOOK_CORRUPTED', true, originalError);
    this.workbookId = workbookId;
  }
}

/**
 * Data validation errors (invalid coordinate, invalid formula, etc.)
 */
export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', true);
    this.field = field;
  }
}
