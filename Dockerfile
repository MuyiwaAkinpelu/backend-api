# Use the official Node.js 16 image as the base image
FROM node:18-alpine AS build

WORKDIR /app

# Set Prisma CLI version
ENV PRISMA_CLI_VERSION=3.0.0

# Copy package.json and yarn.lock to the working directory
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the application code to the working directory
COPY . .

# Generate Prisma client files
RUN npx prisma generate

# Build the application
RUN yarn build

# ---------------------------------------
# Production stage
# ---------------------------------------
FROM node:18-alpine AS production

WORKDIR /app

# Copy the production build from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
# Copy generated prisma client from previous step
COPY --from=build /app/node_modules/.prisma/client  ./node_modules/.prisma/client
# Copy prisma schema - (workaround to fix finding prisma schema in production)
COPY --from=build /app/prisma/schema.prisma ./prisma/schema.prisma

# Install only production dependencies
RUN yarn install --production --frozen-lockfile

# Expose the port on which your NestJS app is listening
ARG APP_PORT=3000
ARG BASE_URL='http://localhost:${APP_PORT}}'
EXPOSE ${APP_PORT}

# Set NODE_ENV to production
ENV NODE_ENV=production

# Migrate and start application
CMD [  "npm", "run", "start:prod" ]