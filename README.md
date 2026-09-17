# 🇮🇳 Samvidhan Quest

An interactive, gamified web platform designed to simplify Indian Constitutional literacy through active recall, instant feedback, and structured learning tiers.

<p align="center">
  <a href="https://samvidhan-quest-nu.vercel.app/">
    <img src="https://img.shields.io/badge/Live_Demo-Vercel-black?style=for-the-badge&logo=vercel" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/Frontend-React%20%7C%20JavaScript-blue?style=for-the-badge&logo=react" alt="Tech Stack" />
  <img src="https://img.shields.io/badge/Design-Responsive%20UI-orange?style=for-the-badge" alt="Responsive UI" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

---

## 🎯 Overview

Traditional civic education often relies on static, text-heavy resources that lead to passive reading and poor retention. **Samvidhan Quest** transforms constitutional study into an engaging, gamified workflow:

$$\text{Learn} \longrightarrow \text{Interact} \longrightarrow \text{Active Recall} \longrightarrow \text{Instant Feedback} \longrightarrow \text{Mastery}$$

Users navigate through core constitutional themes (Fundamental Rights, Preamble, Directive Principles, and Landmark Amendments) while earning progress scores, tracking accuracy, and reviewing contextual explanations for every question.

---

## ✨ Key Features

* **Gamified Active Recall:** Real-time scoring, progression counters, and instant answer evaluations.
* **Component-Driven Architecture:** Decoupled, reusable modules for questions, option cards, navigation, and score summaries.
* **Contextual Explanations:** Detailed constitutional notes and relevant Article references provided immediately upon answer submission.
* **Adaptive Responsive Design:** Fluid grid and flexbox layouts optimized for mobile, tablet, and desktop viewports.
* **Continuous Deployment:** Integrated CI/CD pipeline hosted on Vercel for instant updates on main-branch pushes.

---

## 🏗️ Architecture & Data Flow
┌───────────────────────────┐
                  │      User Interaction     │
                  └─────────────┬─────────────┘
                                │ (Select Answer)
                                ▼
                  ┌───────────────────────────┐
                  │    State Validation Logic │
                  └─────────────┬─────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────────────┐                   ┌───────────────────────────┐
│     Correct Selection     │                   │    Incorrect Selection    │
│  • Increment Score (+1)   │                   │  • Flag Incorrect State   │
│  • Unlock Next Challenge  │                   │  • Display Article Detail │
└───────────┬───────────────┘                   └───────────┬───────────────┘
│                                               │
└───────────────────────┬───────────────────────┘
▼
┌───────────────────────────┐
│  DOM Re-render via State  │
└───────────────────────────┘


---

## 🛠️ Tech Stack

* **Frontend Framework:** React.js / Modern JavaScript (ES6+)
* **Styling & Layout:** CSS3 (Media Queries, Flexbox, CSS Grid)
* **Hosting & CI/CD:** Vercel
* **Version Control:** Git & GitHub

---

## 📂 Project Structure

```text
samvidhan-quest/
├── public/              # Static assets, icons, and civic badges
├── src/
│   ├── components/      # Modular UI units (Navbar, QuestionCard, ScoreBoard)
│   ├── data/            # Constitutional question bank, article references
│   ├── styles/          # Responsive layout and thematic styling
│   ├── App.jsx          # Core routing and high-level state orchestration
│   └── index.js         # Root entry point
├── package.json         # Dependencies and project scripts
└── README.md            # Documentation