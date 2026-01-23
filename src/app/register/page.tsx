import { redirect } from "next/navigation";

// Registration is handled via Google OAuth
// Redirect to login page
export default function RegisterPage() {
  redirect("/login");
}
