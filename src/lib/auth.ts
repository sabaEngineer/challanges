import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email || account?.provider !== "google") return false;

      try {
        // Check if user exists by email or googleId
        const existingUser = await db.user.findFirst({
          where: {
            OR: [
              { email: user.email },
              { googleId: account.providerAccountId },
            ],
          },
        });

        if (existingUser) {
          // Update googleId but preserve custom avatar if user has one
          // Only use Google avatar if user has no avatar set
          await db.user.update({
            where: { id: existingUser.id },
            data: {
              googleId: account.providerAccountId,
              // Keep existing avatar - don't overwrite with Google's
              avatarUrl: existingUser.avatarUrl || user.image,
              fullName: existingUser.fullName || user.name,
            },
          });

          user.id = existingUser.id;
          return true;
        }

        // Create new user with generated username
        const baseUsername = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
        let username = baseUsername;
        let counter = 1;

        // Ensure unique username
        while (await db.user.findUnique({ where: { username } })) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        const newUser = await db.user.create({
          data: {
            email: user.email,
            fullName: user.name,
            avatarUrl: user.image,
            googleId: account.providerAccountId,
            username,
          },
        });

        user.id = newUser.id;
        return true;
      } catch (error) {
        console.error("Error during sign in:", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      username: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}
