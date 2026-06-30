// Sticky Navbar
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Scroll Reveal Animation
const revealElements = document.querySelectorAll('.reveal');

const revealCallback = (entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target); // Optional: stop observing once revealed
        }
    });
};

const revealOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
};

const revealObserver = new IntersectionObserver(revealCallback, revealOptions);

revealElements.forEach(el => {
    revealObserver.observe(el);
});

// Typing Effect
const roles = ["Data Scientist", "ML Engineer", "AI Explorer", "Full-Stack Developer"];
let roleIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typingDelay = 100;
const erasingDelay = 50;
const newRoleDelay = 2000; // Delay before typing next role
const typeElement = document.getElementById('typing-text');

function type() {
    const currentRole = roles[roleIndex];
    
    if (isDeleting) {
        typeElement.textContent = currentRole.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typeElement.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;
    }

    let typeSpeed = isDeleting ? erasingDelay : typingDelay;

    if (!isDeleting && charIndex === currentRole.length) {
        typeSpeed = newRoleDelay;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        typeSpeed = 500;
    }

    setTimeout(type, typeSpeed);
}

// Start typing effect on load
document.addEventListener('DOMContentLoaded', () => {
    // start typing
    if (document.getElementById('typing-text')) {
        setTimeout(type, 1000); 
    }

    // Render Featured Projects
    const featuredContainer = document.getElementById('featured-projects-container');
    if (featuredContainer && typeof projectsData !== 'undefined') {
        // Just pick the first 3 or 4 for featured
        const featuredProjects = projectsData.slice(0, 3);
        featuredProjects.forEach((project, index) => {
            const card = document.createElement('div');
            card.className = 'glass-card project-card reveal active';
            card.style.animationDelay = `${index * 0.1}s`;
            card.style.cursor = 'pointer';
            
            // Add click listener to route to detail page
            card.onclick = (e) => {
                if (e.target.closest('a')) return;
                window.location.href = `project.html?id=${project.id}`;
            };

            const stackHtml = project.techStack.map(tech => `<span>${tech}</span>`).join('');

            card.innerHTML = `
                <div class="project-content">
                    <div class="project-header">
                        <i class="${project.icon} project-icon"></i>
                        <div class="project-links">
                            ${project.githubUrl ? `<a href="${project.githubUrl}" target="_blank" title="View Source"><i class="fab fa-github"></i></a>` : ''}
                        </div>
                    </div>
                    <div style="display:flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <h3 style="margin-bottom:0;">${project.title}</h3>
                        <span style="font-size: 0.75rem; background: var(--glass-bg); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid var(--glass-border); color: var(--secondary);">${project.category}</span>
                    </div>
                    <p>${project.shortDescription}</p>
                    <div class="tech-stack">
                        ${stackHtml}
                    </div>
                </div>
            `;
            
            featuredContainer.appendChild(card);
        });
    }
});
