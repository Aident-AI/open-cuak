#!/bin/bash

npm run envs:pull
npx dotenv-cli -e .env.local -- sh -c 'aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID'
npx dotenv-cli -e .env.local -- sh -c 'aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY'
