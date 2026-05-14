export interface OrphanRecord {
  /** ISO timestamp when the block was orphaned. */
  orphanedAt: string;
  /** Output doc file the orphan lived in before being quarantined. */
  sourceFile: string;
  /** Anchor ID whose disappearance triggered the quarantine. */
  anchorId: string;
  /** Last ISO timestamp the anchor was seen in the IR, if known. */
  anchorLastSeen?: string;
  /** The `id` attribute from `<!-- @manual:start id="..." -->`, if present. */
  manualBlockId?: string;
  /** The original protected block content. */
  content: string;
  /** Absolute path of the quarantine file (set after writing). */
  archivePath?: string;
}
