import { redirect } from "next/navigation";

/** Accounts have been removed - the app is guest-only now. Anyone who still has this URL
 *  bookmarked (or follows a stale external link) lands on the catalog instead of a dead page. */
export default function SignupPage() {
  redirect("/catalog");
}
