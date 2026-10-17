declare module 'eslint' {
  export class ESLint {
    constructor(options?: Record<string, unknown>);
    lintText(
      code: string,
      options?: { filePath?: string; warnIgnored?: boolean }
    ): Promise<
      Array<{
        errorCount: number;
        warningCount: number;
        messages: Array<{
          ruleId: string | null;
          severity: number;
          message: string;
          line: number;
          column: number;
        }>;
      }>
    >;
  }
}
