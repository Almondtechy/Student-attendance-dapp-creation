export async function GET() {
    try {
        const { prisma } = await import("@/lib/prisma");
        const users = await prisma.user.findMany();
        return Response.json(users);
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return Response.json(
            { error: "Database not available. Make sure DATABASE_URL is set and prisma generate has been run." },
            { status: 503 }
        );
    }
}