/**
 * Port for accessing VSCode workspace state (persistent storage per workspace).
 */
export interface IWorkspaceStatePort {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): Promise<void>;
}

export const WORKSPACE_STATE_KEYS = {
  AUTO_OPEN_PANEL: 'codeSquad.autoOpenPanel',
} as const;

export type AutoOpenPanelSetting = 'ask' | 'always' | 'never';
