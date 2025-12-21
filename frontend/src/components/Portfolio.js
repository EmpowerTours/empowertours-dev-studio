import React from 'react';
import './Portfolio.css';

const Portfolio = () => {
  const projects = [
    {
      id: 1,
      title: "Blockchain Settlement Framework",
      description: "Bilateral negotiation tool on Monad blockchain for transparent, voluntary commercial settlements",
      longDescription: "A sophisticated smart contract framework enabling parties to negotiate and settle commercial disputes through transparent, enforceable blockchain mechanisms. Features mutual consent requirements, escrow deposits, configurable review periods, and pull-pattern security architecture.",
      techStack: [
        "Solidity 0.8.20",
        "Monad Blockchain",
        "ethers.js",
        "Caddy Server"
      ],
      features: [
        {
          name: "Escrow Deposits",
          description: "Secure fund locking with automated release mechanisms"
        },
        {
          name: "Mutual Acceptance",
          description: "Bilateral consent required for all settlement terms"
        },
        {
          name: "Review Periods",
          description: "Configurable timeframes for agreement validation"
        },
        {
          name: "Pull-Pattern Security",
          description: "Industry-standard withdrawal pattern preventing reentrancy"
        },
        {
          name: "Transparent Arbitration",
          description: "On-chain dispute resolution with full audit trail"
        },
        {
          name: "Multi-Party Support",
          description: "Extensible architecture for complex commercial relationships"
        }
      ],
      status: "Live Demo Available",
      demoLink: "/rumble-mediation",
      githubLink: "https://github.com/empowertours",
      category: "DeFi Infrastructure",
      year: "2024"
    }
  ];

  return (
    <div className="portfolio">
      <div className="portfolio-hero">
        <h1>Project Portfolio</h1>
        <p>Showcasing blockchain development excellence and innovative DeFi solutions</p>
      </div>

      <div className="projects-container">
        {projects.map((project) => (
          <div key={project.id} className="project-card">
            <div className="project-header">
              <div className="project-title-section">
                <h2>{project.title}</h2>
                <div className="project-meta">
                  <span className="project-category">{project.category}</span>
                  <span className="project-year">{project.year}</span>
                  <span className={`project-status ${project.status === 'Live Demo Available' ? 'live' : ''}`}>
                    {project.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="project-content">
              <div className="project-description">
                <p className="short-description">{project.description}</p>
                <p className="long-description">{project.longDescription}</p>
              </div>

              <div className="tech-stack-section">
                <h3>Technology Stack</h3>
                <div className="tech-stack">
                  {project.techStack.map((tech, index) => (
                    <span key={index} className="tech-badge">{tech}</span>
                  ))}
                </div>
              </div>

              <div className="features-section">
                <h3>Key Features</h3>
                <div className="features-grid">
                  {project.features.map((feature, index) => (
                    <div key={index} className="feature-card">
                      <h4>{feature.name}</h4>
                      <p>{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="project-actions">
                {project.demoLink && (
                  <a
                    href={project.demoLink}
                    className="btn btn-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Live Demo
                  </a>
                )}
                {project.githubLink && (
                  <a
                    href={project.githubLink}
                    className="btn btn-secondary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on GitHub
                  </a>
                )}
              </div>
            </div>

            <div className="project-highlights">
              <div className="highlight-item">
                <div className="highlight-icon">🔒</div>
                <div className="highlight-content">
                  <h4>Security First</h4>
                  <p>Built with industry-standard security patterns and best practices</p>
                </div>
              </div>
              <div className="highlight-item">
                <div className="highlight-icon">⚡</div>
                <div className="highlight-content">
                  <h4>Monad Optimized</h4>
                  <p>Leveraging Monad's high-performance blockchain infrastructure</p>
                </div>
              </div>
              <div className="highlight-item">
                <div className="highlight-icon">🎯</div>
                <div className="highlight-content">
                  <h4>Production Ready</h4>
                  <p>Fully deployed and operational with live demonstration</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="portfolio-footer">
        <div className="footer-card">
          <h3>Looking for Blockchain Development?</h3>
          <p>
            EmpowerTours specializes in building secure, scalable DeFi applications
            on cutting-edge blockchain platforms. From smart contract architecture
            to full-stack dApp development, we deliver production-ready solutions.
          </p>
          <div className="footer-actions">
            <a
              href="https://empowertours.xyz"
              className="btn btn-outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn More About Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
