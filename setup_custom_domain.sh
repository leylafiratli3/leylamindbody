#!/bin/bash

# Custom Domain Setup Script for GitHub Pages
# This script helps you set up your custom domain

echo "🌐 GitHub Pages Custom Domain Setup"
echo "=================================="
echo ""

# Get the custom domain from user
read -p "Enter your custom domain (e.g., yourdomain.com): " CUSTOM_DOMAIN

if [ -z "$CUSTOM_DOMAIN" ]; then
    echo "❌ No domain entered. Exiting."
    exit 1
fi

echo ""
echo "📝 Creating CNAME file with domain: $CUSTOM_DOMAIN"

# Create CNAME file
echo "$CUSTOM_DOMAIN" > CNAME

echo "✅ CNAME file created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Commit and push this CNAME file:"
echo "   git add CNAME"
echo "   git commit -m 'Add custom domain: $CUSTOM_DOMAIN'"
echo "   git push origin main"
echo ""
echo "2. Configure DNS records with your domain registrar:"
echo ""
echo "   A Records (for $CUSTOM_DOMAIN):"
echo "   - 185.199.108.153"
echo "   - 185.199.109.153" 
echo "   - 185.199.110.153"
echo "   - 185.199.111.153"
echo ""
echo "   CNAME Record (for www.$CUSTOM_DOMAIN):"
echo "   - leylafiratli3.github.io"
echo ""
echo "3. Wait 24 hours for DNS propagation"
echo "4. Enable HTTPS in GitHub Pages settings"
echo ""
echo "🔗 Your site will be available at:"
echo "   - https://$CUSTOM_DOMAIN"
echo "   - https://www.$CUSTOM_DOMAIN"
echo ""
echo "📚 For more help, visit: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site"
