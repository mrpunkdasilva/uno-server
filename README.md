# Project Overview

This project serves as the backend for a multiplayer UNO game. It provides a RESTful API to manage players, matches, and core game logic.

# Table of Contents

1.  [Project Overview](#project-overview)
2.  [Detailed Documentation](#detailed-documentation)
3.  [Key Functional Requirements Summary](#key-functional-requirements-summary)
4.  [Technologies](#technologies)
5.  [Installation and Execution](#installation-and-execution)
    1.  [Prerequisites](#prerequisites)
    2.  [Database Configuration](#database-configuration)
        1.  [Using Docker Compose (Recommended)](#using-docker-compose-recommended)
    3.  [Project Execution](#project-execution)
6.  [Project Structure](#project-structure)

## Detailed Documentation

For a more in-depth view of the architecture, design decisions, and general project documentation, please refer to the [Programming 4 Guide](https://github.com/mrpunkdasilva/programming_4/tree/main/guide_progamming_4).

## Key Functional Requirements Summary

The API currently implements the following functionalities for player management:

*   **Player CRUD:**
    *   `GET /api/players`: Lists all players.
    *   `GET /api/players/:id`: Retrieves a player by ID.
    *   `POST /api/players`: Creates a new player.
    *   `PUT /api/players/:id`: Updates an existing player.
    *   `DELETE /api/players/:id`: Deletes a player.

## Technologies

*   **Node.js**: JavaScript runtime environment for server-side applications.
*   **Express**: A minimal and flexible Node.js web application framework, used for building the REST API.
*   **MongoDB**: A NoSQL database used to store application data.
*   **Mongoose**: An Object Data Modeling (ODM) library for MongoDB and Node.js, facilitating database interactions.
*   **Zod**: A TypeScript-first schema declaration and validation library.
*   **Docker**: Used for containerizing and managing the database environment.

## Installation and Execution

### Prerequisites

*   [Node.js](https://nodejs.org/) (version 20.19.0 or higher)
*   [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)

### Database Configuration

#### Using Docker Compose (Recommended)

The simplest way to set up the MongoDB database is by using Docker Compose.

1.  **Start the MongoDB container:**

    ```bash
    docker-compose up -d
    ```

    This command will download the MongoDB image and start a container in the background with the configurations defined in the `docker-compose.yml` file.

### Project Execution

1.  **Install dependencies:**

    ```bash
    npm ci
    ```

    (Use `npm install` for local development if preferred, but `npm ci` is recommended for CI/CD environments).

2.  **Configure environment variables:**

    Create a `.env` file in the project root (`uno-server/.env`) with the following content. Although the `database.js` file has a hardcoded connection URI, it's good practice to use environment variables.

    ```env
    PORT=3000
    MONGO_URI=mongodb://mongoadmin:mongopasswd@localhost:27017/?authSource=admin
    ```

3.  **Start the development server:**

    ```bash
    npm run start:dev
    ```

    The server will be running on `http://localhost:3000`.

### Code Quality and Testing

This project uses several tools to ensure code quality and maintainability:

*   **ESLint**: For static code analysis to catch errors and enforce coding styles.
*   **Prettier**: An opinionated code formatter.
*   **Husky & lint-staged**: To run linters and formatters on staged Git files, ensuring code quality before commits.
*   **Jest**: A JavaScript Testing Framework for writing unit and integration tests.

**Available Scripts:**

*   `npm run lint`: Runs ESLint across all `.js` files in `src/`.
*   `npm run lint:fix`: Runs ESLint and automatically fixes fixable issues.
*   `npm run format`: Runs Prettier to format all relevant files (`.js`, `.json`, `.md`).
*   `npm test`: Executes all Jest tests and generates a code coverage report.

**Test Coverage and GitLab Pages:**

Test coverage reports are automatically generated and published to [GitLab Pages](https://docs.gitlab.com/ee/user/project/pages/) as part of the CI/CD pipeline. You can access the detailed HTML reports through your project's GitLab Pages URL (e.g., `https://your-namespace.gitlab.io/your-project/-/jobs/artifacts/main/raw/coverage/lcov-report/index.html?job=pages` - *replace `your-namespace` and `your-project` with actual values*).

### Continuous Integration/Continuous Deployment (CI/CD)

The project utilizes GitLab CI/CD for automated pipeline execution, configured in the `.gitlab-ci.yml` file. The pipeline includes the following stages:

*   **Install**: Installs project dependencies (`npm ci`).
*   **Lint**: Runs code linting (`npm run lint`) and checks code formatting (`npm run format -- --check`).
*   **Test**: Executes unit and integration tests (`npm test`) and generates coverage reports.
*   **Deploy**: Publishes the test coverage reports to GitLab Pages.


## Project Structure

The project follows a layered architecture to separate concerns:

```
src/
├── core/
│   └── services/         # Contains the application's business logic.
├── infra/
│   ├── models/           # Mongoose schemas defining the data structure.
│   └── repositories/     # Data access layer, responsible for database communication.
└── presentation/
    ├── controllers/      # Controllers that handle HTTP requests and send responses.
    ├── dtos/             # Data Transfer Objects for validating and structuring input/output data.
    ├── middlewares/      # Express middleware for request processing.
    └── routes/           # API route definitions.
```