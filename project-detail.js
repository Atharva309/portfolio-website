document.addEventListener('DOMContentLoaded', () => {
    // Get project ID from URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    const project = projectsData.find(p => p.id === projectId);

    if (!project) {
        document.getElementById('error-message').style.display = 'block';
        return;
    }

    // Show the section
    document.getElementById('project-detail').style.display = 'block';

    // Populate data
    document.title = `${project.title} | Atharva Patil`;
    document.getElementById('p-title').textContent = project.title;
    document.getElementById('p-category').innerHTML = `<i class="${project.icon}"></i> ${project.category}`;
    
    // Links
    const linksContainer = document.getElementById('p-links');
    if (project.liveUrl) {
        linksContainer.innerHTML += `<a href="${project.liveUrl}" target="_blank" class="btn-primary">View Live Demo <i class="fas fa-external-link-alt"></i></a>`;
    }
    if (project.githubUrl) {
        linksContainer.innerHTML += `<a href="${project.githubUrl}" target="_blank" class="btn-secondary"><i class="fab fa-github"></i> View Source</a>`;
    }

    // Image
    const imgContainer = document.getElementById('p-image-container');
    const imgElement = document.getElementById('p-image');
    if (project.imageUrl) {
        imgElement.src = project.imageUrl;
        imgContainer.style.display = 'block';
    } else {
        // Fallback elegant text or abstract pattern could go here, but hiding is cleaner
        imgContainer.style.display = 'none';
    }

    // Content
    document.getElementById('p-content').innerHTML = project.fullDescription;

    // Tech Stack
    const techContainer = document.getElementById('p-tech');
    techContainer.innerHTML = project.techStack.map(tech => `<span>${tech}</span>`).join('');
    
    // Reveal animation
    setTimeout(() => {
        document.querySelector('.reveal').classList.add('active');
    }, 100);
});
