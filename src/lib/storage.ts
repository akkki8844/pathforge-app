// Local storage utilities for Pathforge

export interface UserProfile {
  targetCollege: string;
  intendedMajor: string;
  createdAt: string;
}

export interface BookmarkedActivity {
  id: string;
  name: string;
  category: string;
  type: string;
  cost: string;
  gradeSuitability: string;
  description: string;
  bookmarkedAt: string;
}

const PROFILE_KEY = "pathforge_profile";
const BOOKMARKS_KEY = "pathforge_bookmarks";
const COMPLETED_KEY = "pathforge_completed_activities";

export const getProfile = (): UserProfile | null => {
  const stored = localStorage.getItem(PROFILE_KEY);
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
};

export const saveProfile = (profile: UserProfile): void => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const clearProfile = (): void => {
  localStorage.removeItem(PROFILE_KEY);
};

export const getBookmarks = (): BookmarkedActivity[] => {
  const stored = localStorage.getItem(BOOKMARKS_KEY);
  if (!stored) return [];
  try { return JSON.parse(stored); } catch { return []; }
};

export const addBookmark = (activity: Omit<BookmarkedActivity, "bookmarkedAt">): void => {
  const bookmarks = getBookmarks();
  if (bookmarks.some((b) => b.id === activity.id)) return;
  bookmarks.push({ ...activity, bookmarkedAt: new Date().toISOString() });
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
};

export const removeBookmark = (id: string): void => {
  const bookmarks = getBookmarks().filter((b) => b.id !== id);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
};

export const isBookmarked = (id: string): boolean => {
  return getBookmarks().some((b) => b.id === id);
};

// ── Completed Activities ────────────────────────────────────────────────
export interface CompletedActivity {
  id: string;
  name: string;
  category: string;
  type: string;
  description: string;
  completedAt: string;
}

export const getCompleted = (): CompletedActivity[] => {
  const stored = localStorage.getItem(COMPLETED_KEY);
  if (!stored) return [];
  try { return JSON.parse(stored); } catch { return []; }
};

export const addCompleted = (activity: Omit<CompletedActivity, "completedAt">): void => {
  const items = getCompleted();
  if (items.some((b) => b.id === activity.id)) return;
  items.push({ ...activity, completedAt: new Date().toISOString() });
  localStorage.setItem(COMPLETED_KEY, JSON.stringify(items));
};

export const removeCompleted = (id: string): void => {
  const items = getCompleted().filter((b) => b.id !== id);
  localStorage.setItem(COMPLETED_KEY, JSON.stringify(items));
};

export const isCompleted = (id: string): boolean => {
  return getCompleted().some((b) => b.id === id);
};
