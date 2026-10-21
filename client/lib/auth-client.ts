import { createAuthClient } from "better-auth/react";

const baseURL = (
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  "http://localhost:8081"
).replace(/\/+$/, "");

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include",
  },
});

export const { useSession, signIn, signOut } = authClient;
