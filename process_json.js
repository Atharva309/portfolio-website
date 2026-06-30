const fs = require('fs');

// The JSON provided by the user
const userData = {
    "profile": {
        "name": "Atharva Patil",
        "contact": {
            "email": "aspatil0910@gmail.com",
            "email2": "atpa5127@colorado.edu",
            "phone": "(303) 901-6249",
            "location": "Boulder, Colorado, USA",
            "linkedin": "https://www.linkedin.com/in/atharva-patil-714b77222/",
            "github": "https://github.com/Atharva309",
            "Portfolio Website": "https://atharva309.github.io/portfolio-website/"
        },
        "education": [
            {
                "degree": "MS Data Science",
                "school": "University of Colorado Boulder",
                "graduation": "May 2026",
                "gpa": "3.9/4.0"
            },
            {
                "degree": "BTech Information Technology",
                "minor": "Data Science",
                "school": "Dwarkadas J. Sanghvi College of Engineering, University of Mumbai",
                "graduation": "May 2024",
                "gpa": "8.93/10"
            }
        ]
    },
    "experience": [
        {
            "company": "Projxon",
            "role": "AI Specialist Intern",
            "duration": "Aug 2025 - May 2026",
            "workstreams": [
                {
                    "name": "LinkedIn Analytics Automation",
                    "tools": [
                        "LinkedIn API",
                        "GCP",
                        "Windsor.ai",
                        "Google Sheets",
                        "BigQuery",
                        "Looker Studio",
                        "SQL",
                        "Association Rule Mining"
                    ],
                    "bullets": [
                        "Built automated ETL pipeline from LinkedIn and Windsor.ai APIs into Google Sheets->BigQuery->Looker Studio",
                        "Designed structured BigQuery schemas and SQL transformations for KPI aggregation",
                        "Applied Association Rule Mining to analyze content patterns and engagement relationships",
                        "Developed dashboards for audience demographics, engagement trends, and post performance",
                        "Automated reporting workflows to remove manual marketing analysis"
                    ]
                },
                {
                    "name": "HR Automation System",
                    "tools": [
                        "Google Apps Script",
                        "Google Sheets"
                    ],
                    "bullets": [
                        "Built end-to-end HR automation pipelines using Google Apps Script",
                        "Automated dynamic document generation for offer letters, termination letters, and certificates",
                        "Implemented validation logic, role-based templating, batch processing, and PDF generation",
                        "Integrated automated email workflows for candidate communication and employee transitions",
                        "Designed reusable structured HR data models for process consistency"
                    ]
                },
                {
                    "name": "Gemini HR Chatbot",
                    "tools": [
                        "Gemini API",
                        "Prompt Engineering"
                    ],
                    "bullets": [
                        "Designed conversational HR support logic using Gemini API",
                        "Integrated structured HR knowledge into AI response workflows",
                        "Improved response consistency through prompt engineering and logic validation"
                    ]
                },
                {
                    "name": "OrcaAI",
                    "tools": [
                        "AWS",
                        "Predictive Analytics",
                        "Classification",
                        "Recommendation Systems"
                    ],
                    "bullets": [
                        "Co-designed OrcaAI, an AI-powered business optimization consultant for SMBs",
                        "Structured solution framework using predictive analytics, classification, and recommendation logic",
                        "Built cloud-oriented solution architecture leveraging AWS services",
                        "Secured 2nd place and $25K AWS credits through technical pitch support",
                        "Managed MVP execution by translating business requirements into technical specifications and coordinating external development with client"
                    ]
                }
            ]
        },
        {
            "company": "Exaplus Technologies",
            "role": "AI/ML Engineer Intern",
            "duration": "Dec 2023 – Jul 2024",
            "workstreams": [
                {
                    "name": "LLM-Powered Document Intelligence",
                    "tools": [
                        "OpenAI API",
                        "GPT",
                        "Prompt Engineering",
                        "Python",
                        "FastAPI"
                    ],
                    "bullets": [
                        "Built automated document intelligence pipeline using OpenAI API to extract structured JSON from unstructured client documents — reports, contracts, and financial summaries — replacing manual analyst review.",
                        "Engineered format-agnostic prompts that produced consistent structured outputs across varying document types and layouts, exposed as internal FastAPI endpoint for downstream reporting tools.",
                        "Eliminated manual document review for standard incoming client documents and reduced processing turnaround time."
                    ]
                },
                {
                    "name": "Smart Reporting and Reconciliation",
                    "tools": [
                        "Python",
                        "Pandas",
                        "NLP",
                        "Anomaly Detection"
                    ],
                    "bullets": [
                        "Developed automated financial reconciliation system that ingests invoices, bank statements, and spreadsheets from multiple sources, aligns records by matching identifiers and dates, and flags mismatches.",
                        "Built NLP-based extraction logic to parse financial figures and entity references from unstructured text, with statistical comparison rules to surface anomalous entries.",
                        "Structured outputs as JSON reconciliation reports consumed by client-facing dashboards, reducing manual month-end comparison effort."
                    ]
                },
                {
                    "name": "ML-Driven Hyper-Automation for Business Reporting",
                    "tools": [
                        "K-Means",
                        "Scikit-learn",
                        "Pandas",
                        "ETL"
                    ],
                    "bullets": [
                        "Built end-to-end automation pipeline replacing manual data routing with K-Means clustering model that segments clients by transaction behavior patterns and auto-routes to appropriate report templates.",
                        "Engineered features from raw transaction records and designed modular pipeline architecture supporting multiple client reporting formats and schedules.",
                        "Enabled personalized, segmented report generation per client group — removing human categorization from the full reporting cycle."
                    ]
                }
            ]
        },
        {
            "company": "E4 Software Services",
            "role": "Machine Learning Engineer Intern",
            "duration": "Sept 2023 - Oct 2023",
            "workstreams": [
                {
                    "name": "Resume Parser",
                    "tools": [
                        "SpaCy",
                        "NER",
                        "Python"
                    ],
                    "bullets": [
                        "Built end-to-end resume parsing system using SpaCy NER and custom NLP pipelines",
                        "Extracted structured entities including skills, education, experience, and contact details",
                        "Designed rule-based and statistical extraction logic returning normalized JSON outputs",
                        "Built preprocessing pipelines for text cleaning, tokenization, and validation",
                        "Created evaluation scripts using precision and recall benchmarking"
                    ]
                },
                {
                    "name": "Enterprise Document Parser",
                    "tools": [
                        "Tesseract OCR",
                        "Canny Edge Detection",
                        "SpaCy",
                        "NLP"
                    ],
                    "bullets": [
                        "Built parsing pipeline for structured and semi-structured complex enterprise documents",
                        "Applied OCR preprocessing using Tesseract and Canny edge detection",
                        "Used SpaCy NER, keyword extraction, and contextual pattern matching",
                        "Converted scanned documents into structured JSON key-value outputs"
                    ]
                }
            ]
        },
        {
            "company": "Wama Technology",
            "role": "Flutter Developer Trainee",
            "duration": "Jul 2022 - Aug 2022",
            "tools": [
                "Flutter",
                "Dart",
                "REST APIs",
                "Git",
                "Agile"
            ],
            "bullets": [
                "Developed Android shopping application using Flutter and Dart",
                "Integrated REST APIs for product listings, authentication, and order workflows",
                "Worked in Git-based Agile development environment",
                "Supported UI development, state management, and backend API integration"
            ]
        }
    ],
    "projects": [
        {
            "name": "Explainable AI in Diabetes",
            "tools": [
                "Python",
                "CNN",
                "RNN",
                "MLP",
                "SHAP",
                "LIME",
                "ALE"
            ],
            "bullets": [
                "Built and compared deep learning models for diabetes prediction",
                "Applied SHAP, LIME, and ALE for interpretability",
                "Focused on transparency, bias awareness, and responsible healthcare AI and wrote a research paper on this"
            ]
        },
        {
            "name": "CloudSense",
            "tools": [
                "AWS Lambda",
                "API Gateway",
                "SQS",
                "RDS",
                "FastAPI",
                "OpenAI"
            ],
            "bullets": [
                "Built a serverless AI-powered code review platform that automatically analyzes GitHub commits using webhook-triggered AWS Lambda pipelines and GPT-based review generation.",
                "Designed event-driven AWS cloud architecture with API Gateway, SQS, and Lambda workers to process 1,000+ commit events asynchronously with sub-2 second API response latency.",
                "Integrated GPT-4o-mini with FastAPI and PostgreSQL to generate structured code-quality findings, security insights, and review histories across repository workflows.",
                "Deployed full-stack infrastructure on AWS with JWT-secured APIs, VPC-connected RDS, S3-hosted frontend delivery, and CloudWatch-based monitoring."
            ]
        },
        {
            "name": "Asteroids Analysis",
            "tools": [
                "PostgreSQL",
                "R",
                "Naive Bayes",
                "GGplot",
                "Liquibase"
            ],
            "bullets": [
                "Built Naive Bayes classification pipeline for Near-Earth Objects and hazardous asteroids",
                "Processed 100000+ asteroid records with feature engineering in PostgreSQL",
                "Achieved 98% classification accuracy",
                "Used Liquibase for database version control"
            ]
        },
        {
            "name": "Steam Game Insights",
            "tools": [
                "Gradient Boosting",
                "CLIP",
                "Association Rule Mining",
                "Tableau"
            ],
            "bullets": [
                "Analyzed 25000+ Steam games using API data",
                "Applied CLIP embeddings and Gradient Boosting for success prediction",
                "Used Association Rule Mining for genre and pricing relationships",
                "Built Tableau dashboards for trend visualization"
            ]
        },
        {
            "name": "FIFA Player Analytics Dashboard",
            "tools": [
                "Power BI",
                "DAX"
            ],
            "bullets": [
                "Built interactive dashboard analyzing 17000+ FIFA players from multiple datasets",
                "Created advanced DAX measures and dynamic player comparisons",
                "Built player position-based scatter plots and custom tooltips"
            ]
        },
        {
            "name": "Child Monitoring System",
            "tools": [
                "YOLOv5",
                "CNN",
                "3D-CNN"
            ],
            "bullets": [
                "Published research project for child monitoring using CCTV video intelligence",
                "Implemented YOLOv5 face detection with 91% accuracy",
                "Built CNN emotion recognition across 7 classes with 72% accuracy",
                "Built 3D-CNN activity recognition with 83% accuracy",
                "constructed our own datasets"
            ]
        },
        {
            "name": "AgentSquared",
            "tools": [
                "FastAPI",
                "Gemini API",
                "SQLite",
                "Next.js",
                "RAG",
                "Vultr"
            ],
            "bullets": [
                "Built and deployed a no-code AI agent platform at HackCU 2026 enabling small businesses to create production-ready support and social agents from website URLs or uploaded documents in under 60 seconds.",
                "Engineered a FastAPI + SQLAlchemy backend with RAG-based knowledge ingestion, asynchronous website crawling, JWT authentication, and Gemini-powered persona generation across 15+ REST endpoints.",
                "Implemented multi-agent workflows including customer support chat, social sentiment monitoring, and autonomous brand posting, deployed end-to-end on Vultr using Nginx, PM2, and Ubuntu."
            ]
        },
        {
            "name": "Meridian — Marketing Decision Intelligence Platform",
            "tools": [
                "React",
                "TypeScript",
                "FastAPI",
                "Scikit-learn",
                "SciPy",
                "Zustand",
                "Recharts",
                "OpenAI API",
                "Docker"
            ],
            "bullets": [
                "Built end-to-end Marketing Mix Modeling platform implementing geometric adstock decay, Hill saturation functions, and OLS/Ridge regression to decompose revenue into channel contributions, estimate ROI and elasticity, and generate weekly predictions with model diagnostics (R², MAPE).",
                "Developed budget optimizer using SciPy SLSQP constrained optimization that recommends optimal channel allocation under diminishing returns — maximizing predicted revenue or ROI subject to budget and per-channel bounds.",
                "Built LLM-powered analyst interface using OpenAI function calling with grounded tool handlers (ROI, elasticity, contribution, scenario simulation) — ensuring all responses cite real model outputs with zero hallucination.",
                "Deployed full-stack system: React/TypeScript frontend on Vercel with Zustand state persistence across model runs, FastAPI backend on Hugging Face Spaces serving 7 REST endpoints for data upload, transformation preview, model training, optimization, and AI chat."
            ]
        },
        {
            "name": "Privacy Guard",
            "tools": [
                "Python",
                "OpenAI GPT-4o-mini",
                "PyMuPDF",
                "Apple Vision OCR",
                "OpenCV",
                "Streamlit"
            ],
            "bullets": [
                "Built a two-stage GPT-4o-mini pipeline for clinical document PHI detection — Stage 1 extracts global context (facility name, physician names, institutional phone numbers) so Stage 2 can identify only patient PHI per page, eliminating false positives that rigid pattern matching cannot resolve.",
                "Implemented a tri-tier PDF redaction engine using PyMuPDF for exact text-layer coordinate matching, a sliding window algorithm for PHI split across line breaks, and global PHI persistence ensuring identifiers redacted on page 1 are automatically redacted on all subsequent pages.",
                "Designed a HIPAA-conscious architecture that runs OCR entirely on-device via Apple Vision Neural Engine — only extracted text strings (never raw document images) are sent to OpenAI, with an audit log recording redaction metadata only, never PHI content.",
                "Deployed as a Streamlit application covering 12 PHI categories (name, SSN, DOB, address, phone, email, insurance policy, Medicare ID, employer, and more) with side-by-side redaction preview and downloadable clean PDF output."
            ]
        }
    ],
    "volunteer": [
        {
            "organization": "WeChange NGO",
            "role": "Volunteer",
            "bullets": [
                "Led tutoring initiatives and educational activities for underprivileged children",
                "Organized events including tournaments, workshops, and community activities",
                "Supported food drives and blood donation campaign with 40+ donations"
            ]
        }
    ],
    "skills": {
        "programming": [
            "Python",
            "R",
            "SQL",
            "JavaScript",
            "Dart",
            "Flutter"
        ],
        "ml_ai": [
            "Machine Learning",
            "Deep Learning",
            "CNN",
            "RNN",
            "MLP",
            "3D-CNN",
            "NLP",
            "Computer Vision",
            "OCR",
            "Gradient Boosting",
            "Naive Bayes",
            "Association Rule Mining",
            "SHAP",
            "LIME",
            "ALE",
            "CLIP",
            "Marketing Mix Modeling",
            "LLM"
        ],
        "cloud_backend": [
            "AWS",
            "Lambda",
            "API Gateway",
            "SQS",
            "RDS",
            "FastAPI",
            "REST APIs",
            "BigQuery",
            "GCP",
            "Docker"
        ],
        "databases": [
            "PostgreSQL",
            "MySQL",
            "BigQuery",
            "SQLite"
        ],
        "visualization": [
            "Power BI",
            "DAX",
            "Tableau",
            "Looker Studio",
            "GGplot"
        ],
        "tools": [
            "Git",
            "Liquibase",
            "Android Studio",
            "Google Apps Script"
        ],
        "responsible_ai": [
            "Bias Awareness",
            "Data Privacy",
            "Secure Model Deployment",
            "Structured Logging"
        ]
    }
};

const links = {
    "Explainable AI in Diabetes": { github: "https://github.com/Atharva309/XAI_diabetes", live: "" },
    "CloudSense": { github: "https://github.com/Atharva309/CloudSense", live: "" },
    "Asteroids Analysis": { github: "https://github.com/Atharva309/Asteroid-Analysis", live: "" },
    "Steam Game Insights": { github: "", live: "" },
    "FIFA Player Analytics Dashboard": { github: "https://github.com/Atharva309/FIFA_DASHBOARD", live: "https://app.powerbi.com/view?r=eyJrIjoiZWE0OTg0MDAtNzQzYi00ZjgzLWE3N2EtMzMxNDAyM2U2Y2Q1IiwidCI6ImQxZjE0MzQ4LWYxYjUtNGEwOS1hYzk5LTdlYmYyMTNjYmM4MSIsImMiOjEwfQ%3D%3D" },
    "Child Monitoring System": { github: "", live: "" },
    "AgentSquared": { github: "https://github.com/Atharva309/AgentSquared", live: "" },
    "Meridian — Marketing Decision Intelligence Platform": { github: "https://github.com/Atharva309/Meridian", live: "https://meridian-26kiwy8sz-atharva309s-projects.vercel.app/" },
    "Privacy Guard": { github: "https://github.com/Atharva309/Privacy-Guard", live: "" }
};

userData.projects = userData.projects.map(p => {
    const l = links[p.name];
    if (l) {
        if (l.github) p.githubUrl = l.github;
        if (l.live) p.liveUrl = l.live;
    }
    return p;
});

console.log(JSON.stringify(userData, null, 4));
