export interface AIToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIToolResult {
  tool: string;
  result: string;
  isError?: boolean;
}
