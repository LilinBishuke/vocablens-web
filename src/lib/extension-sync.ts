/**
 * Sync flashcards with VocabLens Chrome extension via external messaging.
 * The extension must have externally_connectable set for this origin.
 */

// Extension ID — known VocabLens extension
const KNOWN_EXTENSION_ID = 'edacmchipmlegnnpndajmdekdnbdnlnp';
let extensionId: string | null = KNOWN_EXTENSION_ID;

/**
 * Detect the VocabLens extension by trying known IDs or discovery.
 * Returns true if extension is available.
 */
export async function detectExtension(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome?.runtime?.sendMessage) {
    return false;
  }

  // Try to detect extension ID from the page
  // In development, the ID changes each time the extension is loaded
  // We'll try to ping and cache the result
  const storedId = localStorage.getItem('vocablens_extension_id');
  if (storedId) {
    try {
      const response = await sendToExtension(storedId, {
        type: 'VOCABLENS_PING',
      });
      if (response?.success) {
        extensionId = storedId;
        return true;
      }
    } catch {
      localStorage.removeItem('vocablens_extension_id');
    }
  }

  return false;
}

/**
 * Set the extension ID manually (from settings or auto-detection).
 */
export function setExtensionId(id: string) {
  extensionId = id;
  localStorage.setItem('vocablens_extension_id', id);
}

/**
 * Get the current extension ID.
 */
export function getExtensionId(): string | null {
  if (!extensionId) {
    extensionId = localStorage.getItem('vocablens_extension_id');
  }
  return extensionId;
}

/**
 * Sync a new card to the extension.
 */
export async function syncCardToExtension(card: {
  word: string;
  definition: unknown;
  createdAt: number;
}): Promise<boolean> {
  const id = getExtensionId();
  if (!id) return false;

  try {
    const response = await sendToExtension(id, {
      type: 'VOCABLENS_SYNC_CARD',
      card,
    });
    return response?.success === true;
  } catch {
    return false;
  }
}

/**
 * Sync card removal to the extension.
 */
export async function syncRemoveToExtension(word: string): Promise<boolean> {
  const id = getExtensionId();
  if (!id) return false;

  try {
    const response = await sendToExtension(id, {
      type: 'VOCABLENS_SYNC_REMOVE',
      word,
    });
    return response?.success === true;
  } catch {
    return false;
  }
}

/**
 * Get all cards from the extension (for initial sync/import).
 */
export async function getCardsFromExtension(): Promise<Record<string, unknown> | null> {
  const id = getExtensionId();
  if (!id) return null;

  try {
    const response = await sendToExtension(id, {
      type: 'VOCABLENS_GET_ALL_CARDS',
    });
    return response?.success ? (response.cards as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function sendToExtension(
  id: string,
  message: unknown
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(id, message, (response: Record<string, unknown>) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
