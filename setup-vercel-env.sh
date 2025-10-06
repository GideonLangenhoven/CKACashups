#!/bin/bash

# Vercel Environment Setup Script
# This script helps set up environment variables for your Vercel deployment

echo "🚀 Vercel Environment Setup Script"
echo "===================================="
echo ""

PROJECT_NAME="y"
echo "Setting up environment for project: $PROJECT_NAME"
echo ""

# Environment variables to set
declare -A ENV_VARS=(
    ["NEXTAUTH_SECRET"]="g+ysHMZwCXQs/9lKsmDx1p9LTeLu+J9WHFvNkvw+yA4="
    ["NEXTAUTH_URL"]="https://y-rose-seven.vercel.app"
    ["SMTP_HOST"]="smtp.gmail.com"
    ["SMTP_PORT"]="587"
    ["SMTP_USER"]="gidslang89@gmail.com"
    ["SMTP_PASS"]="lnlr hgqq hmoy rkqv"
    ["ADMIN_EMAILS"]="gidslang89@gmail.com,info@kayak.co.za"
    ["TZ"]="Africa/Johannesburg"
    ["BRAND_PRIMARY"]="#0A66C2"
    ["BRAND_ACCENT"]="#0B84F3"
    ["EMAIL_DAY_OF_MONTH"]="29"
    ["EMAIL_HOUR_LOCAL"]="08"
)

echo "📋 Environment variables to be added:"
echo "------------------------------------"
for key in "${!ENV_VARS[@]}"; do
    if [[ "$key" == *"PASS"* ]] || [[ "$key" == *"SECRET"* ]]; then
        echo "  $key: ********"
    else
        echo "  $key: ${ENV_VARS[$key]}"
    fi
done
echo ""

echo "⚠️  NOTE: DATABASE_URL will be automatically added when you connect Vercel Postgres"
echo ""

echo "🔧 Setting up environment variables..."
echo ""

# Set each environment variable
for key in "${!ENV_VARS[@]}"; do
    value="${ENV_VARS[$key]}"
    echo "Adding $key..."
    echo "$value" | vercel env add "$key" production 2>&1 | grep -v "Warning"
done

echo ""
echo "✅ Environment variable setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Create Vercel Postgres database:"
echo "   - Visit: https://vercel.com/gideonlangenhovens-projects/y/stores"
echo "   - Click 'Create Database' → 'Postgres'"
echo "   - Name it: cka-cashups-db"
echo "   - Click 'Create' and then 'Connect' to project 'y'"
echo ""
echo "2. After database is connected, redeploy:"
echo "   vercel --prod"
echo ""
