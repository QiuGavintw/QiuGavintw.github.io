document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle')
  const links = document.querySelector('.nav-links')

  toggle.addEventListener('click', () => {
    links.classList.toggle('active')
  })

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('active')
    })
  })

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1'
        entry.target.style.transform = 'translateY(0)'
      }
    })
  }, { threshold: 0.1 })

  document.querySelectorAll('.skill-card, .project-card, .about-content > *').forEach(el => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(30px)'
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease'
    observer.observe(el)
  })
})
