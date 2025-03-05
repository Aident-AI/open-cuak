---
sidebar_position: 1
---

# Get Started

Let's get started with Open Cuak in less than 5 minutes.

### 👉 Start Local Production Build

0. (optional) Make sure you have [`brew`](https://brew.sh/) for package management

   > works on Mac and Linux. For Windows, use WSL2 for now.

   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

   # (optional) on Linux, if `brew` command is not available in terminal, use this to register `brew`
   test -d ~/.linuxbrew && eval "$(~/.linuxbrew/bin/brew shellenv)"
   test -d /home/linuxbrew/.linuxbrew && eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
   echo "eval \"\$($(brew --prefix)/bin/brew shellenv)\"" >> ~/.bashrc

   # (optional) verify the successful installation of `brew`
   brew doctor
   ```

1. Install Open-CUAK package

   ```bash
   brew install Aident-AI/homebrew-tap/open-cuak

   # or use this to update to the latest version
   brew update && brew upgrade Aident-AI/homebrew-tap/open-cuak
   ```

2. Start Open-CUAK services

   > downloading images can take a while (Sorry! We will optimize this soon.)

   ```
   open-cuak start
   ```

3. Ta-da! It is now ready locally at [http://localhost:11970](http://localhost:11970).

   > Don't forget to go to the ⚙️ Configurations page to set your OpenAI or other major model API key to chat with Aiden!
