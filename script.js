// Header scroll effect
document.addEventListener('DOMContentLoaded', function() {
    const header = document.querySelector('header');
    
    function handleScroll() {
        if (window.scrollY > 10) {
            header.classList.add('bg-white/95', 'shadow-sm');
        } else {
            header.classList.remove('bg-white/95', 'shadow-sm');
        }
    }
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
});

// Copy to clipboard functionality
function copyToClipboard(text, buttonElement) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess(buttonElement);
        }).catch(() => {
            fallbackCopyToClipboard(text, buttonElement);
        });
    } else {
        fallbackCopyToClipboard(text, buttonElement);
    }
}

function fallbackCopyToClipboard(text, buttonElement) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopySuccess(buttonElement);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }
    
    textArea.remove();
}

function showCopySuccess(buttonElement) {
    const originalText = buttonElement.innerHTML;
    buttonElement.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Copied!';
    buttonElement.classList.add('copied');
    
    setTimeout(() => {
        buttonElement.innerHTML = originalText;
        buttonElement.classList.remove('copied');
    }, 2000);
}

// Smooth scroll to sections
function smoothScrollTo(targetId) {
    const target = document.querySelector(targetId);
    if (target) {
        const headerHeight = document.querySelector('header').offsetHeight;
        const targetPosition = target.offsetTop - headerHeight - 20;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
}

// Form handling with progressive enhancement
function handleFormSubmit(formElement) {
    const formData = new FormData(formElement);
    const submitButton = formElement.querySelector('button[type="submit"]');
    
    // Only proceed if there's a submit button
    if (!submitButton) {
        console.log('No submit button found, skipping form handling');
        return;
    }
    
    const originalText = submitButton.innerHTML;
    
    // Show loading state
    submitButton.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Sending...';
    submitButton.disabled = true;
    formElement.classList.add('loading');
    
    // Simulate form submission (replace with actual Formspree endpoint)
    setTimeout(() => {
        showMessage(formElement, 'Thank you for your message. I\'ll get back to you soon.', 'success');
        formElement.reset();
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
        formElement.classList.remove('loading');
    }, 2000);
}

function showMessage(formElement, message, type) {
    // Remove existing messages
    const existingMessage = formElement.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new message
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    
    // Insert before form
    formElement.parentNode.insertBefore(messageElement, formElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageElement.remove();
    }, 5000);
}

// Reduced motion detection
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Initialize animations only if reduced motion is not preferred
if (!prefersReducedMotion()) {
    // Add hero animation class after page load
    window.addEventListener('load', function() {
        const heroContent = document.querySelector('.hero-animate');
        if (heroContent) {
            heroContent.style.opacity = '1';
        }
    });
}

// Mobile menu focus trap
function initMobileMenuFocusTrap() {
    const mobileMenu = document.querySelector('[x-data*="mobileMenuOpen"]');
    if (!mobileMenu) return;
    
    const focusableElements = mobileMenu.querySelectorAll(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    
    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];
    
    mobileMenu.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstFocusableElement) {
                    e.preventDefault();
                    lastFocusableElement.focus();
                }
            } else {
                if (document.activeElement === lastFocusableElement) {
                    e.preventDefault();
                    firstFocusableElement.focus();
                }
            }
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initMobileMenuFocusTrap();
    
    // Initialize copy buttons
    document.querySelectorAll('[data-copy]').forEach(button => {
        button.addEventListener('click', function() {
            const textToCopy = this.getAttribute('data-copy');
            copyToClipboard(textToCopy, this);
        });
    });
    
    // Initialize form submissions (exclude Mailchimp forms, Alpine.js forms, and Formspree forms)
    document.querySelectorAll('form').forEach(form => {
        // Skip Mailchimp forms - they handle their own submission
        if (form.id === 'mc-embedded-subscribe-form') {
            return;
        }
        
        // Skip Formspree forms - they handle their own submission
        if (form.action && form.action.includes('formspree.io')) {
            return;
        }
        
        // Skip Alpine.js forms (they have x-data attributes)
        if (form.hasAttribute('x-data')) {
            return;
        }
        
        // Only handle forms that have submit buttons
        const submitButton = form.querySelector('button[type="submit"]');
        if (!submitButton) {
            return;
        }
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            handleFormSubmit(this);
        });
    });
    
    // Initialize smooth scroll links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            smoothScrollTo(targetId);
        });
    });
});

// Audio player enhancement
function initAudioPlayer() {
    const audioElements = document.querySelectorAll('audio');
    
    audioElements.forEach(audio => {
        // Create custom wrapper if needed
        const wrapper = audio.parentElement;
        if (wrapper && wrapper.classList.contains('audio-wrapper')) {
            // Add custom controls or styling
            wrapper.classList.add('relative');
        }
    });
}

// Lazy loading for images
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// Initialize additional features
window.addEventListener('load', function() {
    initAudioPlayer();
    initLazyLoading();
});

// FAQ functionality
function initFAQ() {
    const faqToggles = document.querySelectorAll('.faq-toggle');
    
    if (faqToggles.length === 0) {
        return; // No FAQ elements found
    }
    
    // Ensure all FAQ items start collapsed
    document.querySelectorAll('.faq-content').forEach(content => {
        content.classList.remove('open');
    });
    
    // Reset all icons to point down
    document.querySelectorAll('.faq-icon').forEach(icon => {
        icon.style.setProperty('transform', 'rotate(0deg)', 'important');
    });
    
    faqToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            
            const faqItem = this.closest('.faq-item');
            const content = faqItem.querySelector('.faq-content');
            const icon = faqItem.querySelector('.faq-icon');
            const isOpen = content.classList.contains('open');
            
            // Close all other FAQ items
            document.querySelectorAll('.faq-content').forEach(item => {
                if (item !== content) {
                    item.classList.remove('open');
                }
            });
            
            // Reset all other icons
            document.querySelectorAll('.faq-icon').forEach(item => {
                if (item !== icon) {
                    item.style.setProperty('transform', 'rotate(0deg)', 'important');
                }
            });
            
            // Toggle current item
            if (isOpen) {
                // Close
                content.classList.remove('open');
                icon.style.setProperty('transform', 'rotate(0deg)', 'important');
            } else {
                // Open
                content.classList.add('open');
                icon.style.setProperty('transform', 'rotate(180deg)', 'important');
            }
        });
    });
}

// Initialize FAQ when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initFAQ();
});
