#!/bin/bash

# Image Optimization Script for MindBody Healing Website
# This script automatically resizes and compresses images while maintaining quality

echo "🖼️  Starting image optimization process..."

# Create backup directory
mkdir -p assets_backup
echo "📁 Created backup directory"

# Backup original images
cp -r assets/* assets_backup/
echo "💾 Backed up original images"

# Function to optimize images
optimize_image() {
    local input_file="$1"
    local filename=$(basename "$input_file")
    local extension="${filename##*.}"
    local name="${filename%.*}"
    
    echo "🔄 Processing: $filename"
    
    # Get original file size
    original_size=$(stat -f%z "$input_file" 2>/dev/null || stat -c%s "$input_file" 2>/dev/null)
    original_size_mb=$((original_size / 1024 / 1024))
    
    # Determine optimal dimensions based on image type and usage
    if [[ "$filename" == *"hero"* ]] || [[ "$filename" == *"leylaportrait"* ]] || [[ "$filename" == *"leylainnature"* ]]; then
        # Hero and main portrait images - larger but still optimized
        max_width=1200
        max_height=800
        quality=85
    elif [[ "$filename" == *"icon"* ]] || [[ "$filename" == *"logo"* ]]; then
        # Icons and logos - smaller
        max_width=200
        max_height=200
        quality=90
    elif [[ "$filename" == *"leyla"* ]] && [[ "$filename" == *"yoga"* ]]; then
        # Yoga images - medium size
        max_width=800
        max_height=600
        quality=85
    else
        # General images - medium size
        max_width=1000
        max_height=750
        quality=85
    fi
    
    # Create temporary file
    temp_file="temp_${filename}"
    
    # Resize and compress image
    if [[ "$extension" =~ ^(jpg|jpeg|JPG|JPEG)$ ]]; then
        convert "$input_file" \
            -resize "${max_width}x${max_height}>" \
            -quality $quality \
            -strip \
            -interlace Plane \
            "$temp_file"
    elif [[ "$extension" =~ ^(png|PNG)$ ]]; then
        convert "$input_file" \
            -resize "${max_width}x${max_height}>" \
            -strip \
            -define png:compression-level=9 \
            -define png:compression-strategy=1 \
            "$temp_file"
    elif [[ "$extension" =~ ^(mov|MOV)$ ]]; then
        # For video files, just copy (we'll handle video optimization separately if needed)
        cp "$input_file" "$temp_file"
    else
        echo "⚠️  Skipping unsupported format: $filename"
        return
    fi
    
    # Get new file size
    new_size=$(stat -f%z "$temp_file" 2>/dev/null || stat -c%s "$temp_file" 2>/dev/null)
    new_size_mb=$((new_size / 1024 / 1024))
    
    # Calculate compression ratio
    if [ $original_size -gt 0 ]; then
        compression_ratio=$((100 - (new_size * 100 / original_size)))
        echo "📊 $filename: ${original_size_mb}MB → ${new_size_mb}MB (${compression_ratio}% reduction)"
    fi
    
    # Replace original with optimized version
    mv "$temp_file" "$input_file"
}

# Process all images in assets directory
echo "🚀 Starting optimization of all images..."
for image in assets/*; do
    if [ -f "$image" ]; then
        optimize_image "$image"
    fi
done

echo ""
echo "✅ Image optimization complete!"
echo "📁 Original images backed up in: assets_backup/"
echo "🎯 Optimized images are now in: assets/"

# Show total size reduction
original_total=$(du -sh assets_backup/ | cut -f1)
new_total=$(du -sh assets/ | cut -f1)
echo "📈 Total size: $original_total → $new_total"

echo ""
echo "🔍 You can compare original vs optimized images in the assets_backup/ folder"
echo "💡 If you're happy with the results, you can delete the backup folder"
