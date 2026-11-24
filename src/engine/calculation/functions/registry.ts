import {
  FormulaFunctionHandler,
  FunctionCategory,
  FunctionDefinition
} from '../types';

export class FunctionRegistry {
  private definitions = new Map<string, FunctionDefinition>();

  public register(def: FunctionDefinition): void {
    const key = def.name.toUpperCase();
    this.definitions.set(key, def);
  }

  public get(name: string): FormulaFunctionHandler | undefined {
    return this.definitions.get(name.toUpperCase())?.handler;
  }

  public getDefinition(name: string): FunctionDefinition | undefined {
    return this.definitions.get(name.toUpperCase());
  }

  public has(name: string): boolean {
    return this.definitions.has(name.toUpperCase());
  }

  public getAllDefinitions(): FunctionDefinition[] {
    return Array.from(this.definitions.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  public getAll(): FunctionDefinition[] {
    return this.getAllDefinitions();
  }

  public getCategories(): FunctionCategory[] {
    return [
      'Lookup & Reference',
      'Text',
      'Date & Time',
      'Mathematical',
      'Statistical',
      'Logical',
      'Information'
    ];
  }

  public getRegisteredNames(): string[] {
    return Array.from(this.definitions.keys()).sort();
  }

  public getByCategory(category: FunctionCategory): FunctionDefinition[] {
    return this.getAllDefinitions().filter((def) => def.category === category);
  }

  public search(query: string): FunctionDefinition[] {
    const q = query.trim().toUpperCase();
    if (!q) return this.getAllDefinitions();

    return this.getAllDefinitions().filter(
      (def) =>
        def.name.includes(q) ||
        def.description.toUpperCase().includes(q) ||
        def.category.toUpperCase().includes(q)
    );
  }

  /**
   * Returns autocomplete suggestions for a partially typed function name.
   */
  public getAutocompleteSuggestions(prefix: string): FunctionDefinition[] {
    const clean = prefix.trim().toUpperCase();
    if (!clean) return [];

    return this.getAllDefinitions().filter((def) => def.name.startsWith(clean));
  }

  public getSuggestions(prefix: string): FunctionDefinition[] {
    return this.getAutocompleteSuggestions(prefix);
  }
}

export const functionRegistry = new FunctionRegistry();
