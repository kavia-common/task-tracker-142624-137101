#!/bin/bash
cd /home/kavia/workspace/code-generation/task-tracker-142624-137101/TaskTrackerMonolithicApplication
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

