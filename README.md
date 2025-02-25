<img src="./apps/web/public/assets/icons/open-cuak-logo.png" alt="Open CUAK Logo">

<h1 align="center">🤖 - Reliable Automation Agents at Scale - 👥</h1>

Open CUA Kit (Computer Use Agent), or Open-CUAK (pronounced "quack" 🦆🗣️), is THE platform for managing automation agents at scale — starting with browsers. The Kubernetes for CUA agents.

### 🎯 Why Open-CUAK?

In the real world, for real businesses, working with real people, reliability is everything.
When automation becomes reliable, it becomes scalable.
And when it becomes scalable, it becomes profitable.

That’s why Open-CUAK is designed to run and manage **thousands of** automation agents, ensuring each one is **reliable**.

This project is still in its very early days, but our team is working very hard to make it a reality, soon.
This is just the beginning of a new era in work, a new way to a world of **abundant productivity**.

And when productivity becomes truly abundant, we want to make sure it is **equally distributed**.

That's why we are making it open-sourced, today.

_Read more in our [launch blog](https://aident.ai/blog/openai-operator-open-source-alternative)._

---

<p align="center">❤️ Built and open-sourced by <a href="https://aident.ai">Aident AI</a> team. ❤️</p>
<p align="center"><a href="https://aident.ai"><img src="./apps/web/public/assets/icons/aident-logo-rounded-512.png" alt="Aident AI Logo" width="30" height="30" ></a></p>

## Quick Start

### 🛠️ Environment Setup

1.  Make sure you have `docker` installed on your machine. You can download it from [here](https://www.docker.com/products/docker-desktop).
2.  Make sure you have `docker-compose` installed as well. Install from [here](https://docs.docker.com/compose/install/).
3.  Clone the repository and navigate to the root directory.

    ```bash
    git clone https://github.com/Aident-AI/open-cuak.git
    cd open-cuak
    ```

### 👉 Run Production Build

1. Set OpenAI API Key in `.example.env` file. (You can also set that in `.env.production` after Step 2)

   ```bash
   # [Required] Please add your OpenAI key
   OPENAI_API_KEY="your-openai-api-key-here"
   ```

2. Start the services (at repo root).

   ```bash
   bash quick-start.sh

   # or (if you have `npm` installed)
   npm run docker:up
   ```

3. Ta-da! It is now ready locally at [http://localhost:3000](http://localhost:3000).

<p align="center">&nbsp;</p>

## Demos

1. ### Agent Demo #1: Canva Use Agent

   An automation agent uses Canva to create a poster for President's Day. When it encounters issues, such as whether to use Pro templates (require a Canva paid plan), it proactively asks the user for additional instructions.

   https://github.com/user-attachments/assets/f283189b-bc90-4875-8bd5-75b2a6a4bf9f

2. ### Agent Demo #2: Expedia Flight Search

   An agent uses built-in remote-browser running locally to search for flight tickets on Expedia.

   https://github.com/user-attachments/assets/e2dd7276-fff7-4ed1-a042-3c1a6bbecef8

3. ### Feature Demo: Account Management

   Account Management lets agents use your account and tools on your behalf.

   https://github.com/user-attachments/assets/1de1069d-053f-408f-b07b-61b399bfcc1f

<p align="center">&nbsp;</p>
<p align="center">Watch more on our <a href="https://www.youtube.com/@aident-ai">Youtube channel</a>, and subscribe to see more.</p>

<p align="center">&nbsp;</p>

## Core Features

    ✅ Run Operator-like automation workflows locally, ensuring full privacy
    ✅ Use vision-based automation with more flexibility and reliability, just like a human
    ✅ Turn any browser into an Operator-companion, with a browser extension
    ✅ Utilize a dedicated remote browser to mitigate risks associated, without sharing your own
    ✅ Use any vision-compatible model, whether frontier or open-source (Claude, Gemini, LLaVA, etc.)
    ✅ Bypass frustrating bot detection, unlocking more automation possibilities
    ✅ Cookie management for easy login, without the need for manual re-login
    🔜 Teach agents new workflows reliably, with SOP-based training
    🔜 Centralize all account access in one place, managing everything agents have access to
    ⏳ Monitor and manage a large number of tasks, with built-in observability tools
    ⏳ Deploy and scale hundreds of agents to execute real-world tasks, in parallel
    ⏳ Open source an RL-trained CUA model to run automations, for free

<p align="center">&nbsp;</p>

## Development Setup

### ⚡ Start Development Servers

1.  Install dependencies.

    ```bash
    # on mac
    brew install node

    # on linux
    sudo apt install nodejs npm
    ```

    ```bash
    npm install -g pnpm
    ```

    ```bash
    # at repo root
    # on mac
    npm run init:mac

    # on linux
    npm run init:linux
    ```

2.  Start the dev servers.

    ```bash
    # at repo root
    npm run dev

    ```

3.  Now, it is ready locally at [http://localhost:3000](http://localhost:3000).

### ▶️ Build and Run Production Build from Local

1. Run local production build (with `docker`).

   ```bash
   # at repo root
   npm run docker:start

   ```
