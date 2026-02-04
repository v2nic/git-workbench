# Use Node.js LTS as base image
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Install git, bash, curl, and OpenSSH client
RUN apk add --no-cache \
    git \
    bash \
    curl \
    openssh-client \
    jq

# Install GitHub CLI for Alpine using binary
RUN GH_VERSION=$(curl -s https://api.github.com/repos/cli/cli/releases/latest | grep '"tag_name"' | cut -d '"' -f 4) \
    && curl -L "https://github.com/cli/cli/releases/download/${GH_VERSION}/gh_${GH_VERSION#v}_linux_amd64.tar.gz" | tar xz \
    && mv "gh_${GH_VERSION#v}_linux_amd64/bin/gh" /usr/local/bin/ \
    && rm -rf "gh_${GH_VERSION#v}_linux_amd64"

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create app data directory
RUN mkdir -p /app/data

# Expose port 4498 (GHWT on telephone keypad: G=4, H=4, W=9, T=8)
EXPOSE 4498

# Set environment variables
ENV NODE_ENV=production
ENV SOURCE_BASE_PATH=/home/node/Source
ENV APP_DATA_PATH=/app/data

# Start the application
CMD ["npm", "start"]
