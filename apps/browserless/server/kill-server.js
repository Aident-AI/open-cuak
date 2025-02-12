#!/usr/bin/env node

const express = require('express');
const { exec } = require('child_process');
const axios = require('axios');

const app = express();
const PORT = 11975;

// Middleware to parse JSON bodies
app.use(express.json());

/**
 * POST /kill-process
 * Expects JSON body: { "execSessionId": "exec-session-uuid", "token": "some-token" }
 */
app.post('/kill-process', async (req, res) => {
  const { execSessionId, token } = req.body;
  if (!token || token !== process.env.BROWSERLESS_AUTH_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  if (!execSessionId || typeof execSessionId !== 'string')
    return res.status(400).json({ error: 'Invalid or missing execSessionId' });

  try {
    const response = await axios.get(`http://localhost:3000/sessions/?token=${token}`);
    const sessions = response.data;

    const matchingSession = sessions.find(
      (session) =>
        session.type === 'browser' &&
        session.launchOptions?.args?.some((arg) => arg === `--exec-session-id=${execSessionId}`),
    );
    if (!matchingSession) return res.status(404).json({ error: 'No matching browser session found' });

    const command = `ps aux | grep ${execSessionId} | grep "/app/extension" | grep -v grep | awk '{print $2}' | xargs kill -9`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Execution error: ${error}`);
        return res.status(500).json({ error: 'Failed to execute command' });
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return res.status(500).json({ error: stderr });
      }

      res.json({ success: true, message: 'Process killed if matching pattern', output: stdout.trim() });
    });
  } catch (error) {
    console.error(`Error fetching sessions: ${error}`);
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
