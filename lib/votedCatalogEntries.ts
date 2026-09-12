const KEY = "sim_voted_catalog_ids";

/** Which "in development" catalog entries this browser has already voted for, so the vote
 *  button can disable itself instead of letting one visitor inflate a count by re-clicking.
 *  Purely a client-side courtesy, not an anti-abuse guarantee. */
export function getVotedCatalogIds(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function markCatalogIdVoted(id: string): void {
  try {
    const current = getVotedCatalogIds();
    current.add(id);
    localStorage.setItem(KEY, JSON.stringify([...current]));
  } catch {
    // localStorage unavailable - the button will just remain clickable this session.
  }
}
