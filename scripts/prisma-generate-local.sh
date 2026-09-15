#!/bin/bash
# Generate Prisma Client locally without DATABASE_URL
# Use this when you need to regenerate client after schema changes

set -e

echo "🔧 Generating Prisma Client (no DB connection needed)..."

# Use dummy DATABASE_URL for generation only
export DATABASE_URL="postgresql://local:local@localhost:5432/local?schema=public"

npx prisma generate

echo "✅ Prisma Client generated successfully!"
echo ""
echo "Note: This only generates the TypeScript client."
echo "To apply migrations, you need a real DATABASE_URL."
