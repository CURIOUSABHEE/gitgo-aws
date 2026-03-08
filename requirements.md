# gitgo - Software Requirements Specification

## 1. Introduction

### 1.1 Purpose
The purpose of this document is to describe the functional and non-functional requirements of gitgo, a web-based platform designed to help junior developers and students discover suitable open-source projects, understand project codebases using AI, collaborate through a community feed, and generate professional portfolios automatically.

This SRS is intended for:
- Project evaluators
- Developers
- Future maintainers
- Academic reviewers

### 1.2 Scope
gitgo provides an end-to-end solution that:
- Recommends open-source projects based on user skills and experience
- Helps users understand unfamiliar repositories using AI
- Enables community interaction among developers
- Automatically generates deployable portfolios and resumes

The system integrates with external platforms such as GitHub and LinkedIn, and uses AI to reduce the learning curve of open-source contribution.

## 2. Overall Description

### 2.1 Product Perspective
gitgo is a web-based application built using a client–server architecture. It uses Next.js for both frontend and backend logic, integrates with GitHub APIs, and leverages AI services for project analysis and portfolio generation.

### 2.2 Product Functions
Major functions of the system include:
- User authentication and profile management
- Community feed with posts, likes, and comments
- Discovery of trending and personalized open-source projects
- AI-powered repository understanding
- Notifications for relevant new repositories
- One-click portfolio and resume generation

### 2.3 User Classes and Characteristics

| User Type | Description |
|-----------|-------------|
| Student Developer | Beginner or intermediate programmer exploring open source |
| Junior Developer | Early-career developer seeking real-world projects |
| Admin (Future Scope) | System moderator and content manager |

## 3. System Architecture Overview

### 3.1 Technology Stack

**Frontend:**
- Next.js
- Tailwind CSS

**Backend:**
- Next.js (API Routes)
- PostgreSQL
- Prisma ORM
- Socket.io (real-time notifications)
- NextAuth (authentication)

**DevOps:**
- AWS (EC2 / RDS / S3)

## 4. Functional Requirements

### 4.1 Authentication Module

- Users shall be able to sign up and sign in using secure authentication
- The system shall support GitHub and email-based authentication
- The system shall securely store user credentials

### 4.2 Community Module

- Users shall be able to view the community feed
- Users shall be able to create posts
- Users shall be able to like and comment on posts
- The system shall display real-time updates using WebSockets

### 4.3 Open Source Project Discovery

- Users shall be able to browse trending repositories
- Users shall receive personalized project recommendations
- Users shall search for open-source projects by domain or tech stack

### 4.4 AI-Powered Project Understanding

- The system shall analyze repository structure
- The system shall generate project summaries
- The system shall explain the purpose of files and folders
- The system shall display workflow and architecture diagrams
- The system shall identify the technology stack used in the project

### 4.5 External Integrations

- Users shall connect their GitHub profiles
- Users shall connect their LinkedIn profiles
- Users shall upload resumes in PDF format
- The system shall aggregate all data for analysis

### 4.6 Notification System

- The system shall notify users about new repositories in their preferred domain
- Notifications shall be delivered in real time

### 4.7 Portfolio as a Service

- Users shall generate a portfolio with one click
- Users shall choose from multiple templates
- The system shall generate portfolio content using AI
- The system shall allow deployment of the portfolio
- The system shall make the portfolio publicly accessible

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

- Page load time should be under 3 seconds
- AI responses should be delivered within acceptable latency
- The system should support concurrent users

### 5.2 Security Requirements

- User data must be encrypted
- OAuth-based authentication must be implemented
- Secure API access must be enforced

### 5.3 Scalability

- The system should scale horizontally on AWS
- Database queries must be optimized

### 5.4 Usability

- The UI must be beginner-friendly
- The platform must be accessible on desktop devices
- Clear navigation must be provided

### 5.5 Reliability

- System uptime should be high
- Failures in AI services should be gracefully handled

## 6. Assumptions and Dependencies

### Assumptions
- Users have basic knowledge of GitHub
- External APIs remain available
- AI services are accessible via API

## 7. Future Enhancements

- Contributor difficulty labeling
- Mentorship matching
- Issue-level contribution guidance
- Mobile application support
- Admin moderation dashboard

## 8. Conclusion

gitgo aims to simplify open-source contribution and career building for junior developers by combining AI-assisted understanding, personalized discovery, and portfolio automation into a single unified platform.
