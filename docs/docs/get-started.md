---
sidebar_position: 1
---

# Get Started

Let's get started with Open Cuak in less than 5 minutes.

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
   npm run quick:start
   ```

3. Ta-da! It is now ready locally at [http://localhost:11970](http://localhost:11970).
