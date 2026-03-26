#!/bin/bash

echo "🔎 Checking for forbidden mock usage..."

if grep -R "mockData" app --exclude-dir=node_modules --exclude-dir=.next; then
  echo "❌ mockData detected. Remove mocks before committing."
  exit 1
fi

if grep -R "systemData" app --exclude-dir=node_modules --exclude-dir=.next; then
  echo "❌ systemData detected. Remove mocks before committing."
  exit 1
fi

echo "✅ No mocks detected."
exit 0
