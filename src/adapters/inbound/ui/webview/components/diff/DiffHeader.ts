/**
 * Diff Header Component
 *
 * Renders file path, stats badges, and view mode toggle.
 */

export interface DiffStats {
  additions: number;
  deletions: number;
}

export type ViewMode = 'diff' | 'scope' | 'preview';

export interface DiffHeaderProps {
  filePath: string;
  stats: DiffStats;
  viewMode: ViewMode;
  hasScopedDiff: boolean;
  isMarkdown: boolean;
  aiActive: boolean;
}

/**
 * Check if file is markdown
 */
export function isMarkdownFile(filePath: string): boolean {
  return (
    filePath.endsWith('.md') ||
    filePath.endsWith('.markdown') ||
    filePath.endsWith('.mdx')
  );
}

/**
 * Render diff stats badges
 */
export function renderDiffStats(stats: DiffStats): string {
  return `
    <span class="stat-added">+${stats.additions}</span>
    <span class="stat-removed">-${stats.deletions}</span>
  `;
}

/**
 * Render view mode toggle button
 */
export function renderViewModeToggle(
  viewMode: ViewMode,
  hasScopedDiff: boolean,
  isMarkdown: boolean
): string {
  if (isMarkdown) {
    return `
      <div class="view-mode-toggle">
        <button class="toggle-btn" onclick="toggleDiffViewMode()">${viewMode === 'preview' ? 'Diff' : 'Preview'}</button>
      </div>
    `;
  }

  if (hasScopedDiff) {
    return `
      <div class="view-mode-toggle">
        <button class="toggle-btn" onclick="toggleDiffViewMode()">Scope</button>
      </div>
    `;
  }

  return '';
}

/**
 * Render feed toggle button (only when AI is active)
 */
export function renderFeedToggle(aiActive: boolean): string {
  if (!aiActive) return '';
  return '<button class="feed-toggle-btn" onclick="toggleFeed()" title="Show HN Feed">📰</button>';
}

/**
 * Render complete stats section
 */
export function renderStatsSection(props: DiffHeaderProps): string {
  const { stats, viewMode, hasScopedDiff, isMarkdown, aiActive } = props;

  const statsHtml = renderDiffStats(stats);
  const toggleHtml = renderViewModeToggle(viewMode, hasScopedDiff, isMarkdown);
  const feedToggleHtml = renderFeedToggle(aiActive);

  return `${statsHtml}${toggleHtml}${feedToggleHtml}`;
}

/**
 * Update diff header with file info
 */
export function updateDiffHeader(
  headerEl: HTMLElement,
  statsEl: HTMLElement,
  props: DiffHeaderProps,
  onOpenFile: (filePath: string) => void
): void {
  const { filePath, stats, viewMode, hasScopedDiff, isMarkdown, aiActive } = props;

  headerEl.textContent = filePath;
  headerEl.style.cursor = 'pointer';
  headerEl.onclick = () => onOpenFile(filePath);

  statsEl.innerHTML = renderStatsSection({
    filePath,
    stats,
    viewMode,
    hasScopedDiff,
    isMarkdown,
    aiActive,
  });
}

/**
 * Render placeholder when no file selected
 */
export function renderPlaceholder(selectedFile: string | null): string {
  return `
    <div class="placeholder">
      <div class="placeholder-icon">${selectedFile ? '✓' : '📝'}</div>
      <div class="placeholder-text">${selectedFile ? 'No changes in this file' : 'Select a modified file to view changes'}</div>
    </div>
  `;
}
