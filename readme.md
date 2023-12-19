# Polling System API

This repository contains the source code for a polling system API assignemnt for Abhiman Innovation built using Node.js, Express, and MySQL. The API provides endpoints to create polls, questions, submit poll responses, and fetch analytics.

## Routes

### 1. Create a New Poll

- **Endpoint:** `POST /create-poll`
- **Description:** Create a new poll with the provided details.
- **Request Body:**
  - `pollTitle` (string): Title of the poll.
  - `pollCategory` (string): Category of the poll.
  - `startDate` (string, YYYY-MM-DD): Start date of the poll.
  - `endDate` (string, YYYY-MM-DD): End date of the poll.
  - `minReward` (number): Minimum reward for participating.
  - `maxReward` (number): Maximum reward for participating.
- **Response:**
  - `message` (string): Success message.
  - `pollId` (number): ID of the newly created poll.

### 2. Create a New Question

- **Endpoint:** `POST /create-question`
- **Description:** Create a new question for a specific poll.
- **Request Body:**
  - `pollId` (number): ID of the poll to which the question belongs.
  - `questionType` (string, "single" or "multiple"): Type of question.
  - `questionText` (string): Text of the question.
  - `options` (array of strings): Array of options for the question.
  - `optionVotes` (array of numbers): Initial count of votes for each option.
- **Response:**
  - `message` (string): Success message.
  - `questionId` (number): ID of the newly created question.

### 3. Fetch All Polls

- **Endpoint:** `GET /all-polls`
- **Description:** Fetch details of all polls.
- **Response:**
  - `polls` (array): Array of poll objects with formatted information.

### 4. Update Poll using Poll ID

- **Endpoint:** `PUT /update-poll`
- **Description:** Update details of a specific poll.
- **Request Body:**
  - `pollId` (number): ID of the poll to be updated.
  - `title` (string, optional): New title of the poll.
  - `category` (string, optional): New category of the poll.
  - `minReward` (number, optional): New minimum reward for participating.
  - `maxReward` (number, optional): New maximum reward for participating.
  - `startDate` (string, YYYY-MM-DD, optional): New start date of the poll.
  - `endDate` (string, YYYY-MM-DD, optional): New end date of the poll.
- **Response:**
  - `message` (string): Success message.

### 5. Update Question using Question ID

- **Endpoint:** `PUT /update-question`
- **Description:** Update details of a specific question.
- **Request Body:**
  - `questionId` (number): ID of the question to be updated.
  - `questionText` (string, optional): New text of the question.
  - `options` (array of strings, optional): New array of options for the question.
  - `questionType` (string, "single" or "multiple", optional): New type of question.
  - `optionVotes` (array of numbers, optional): Updated count of votes for each option.
- **Response:**
  - `message` (string): Success message.

### 6. Create a New User

- **Endpoint:** `POST /create-user`
- **Description:** Create a new user with the provided username.
- **Request Body:**
  - `username` (string): Username of the new user.
- **Response:**
  - `userId` (number): ID of the newly created user.
  - `message` (string): Success message.

### 7. Fetch User Poll Info

- **Endpoint:** `GET /user-poll-info`
- **Description:** Fetch information about polls for a specific user.
- **Request Headers:**
  - `user-id` (number): ID of the user.
  - `start-date` (string, optional, YYYY-MM-DD): Start date for filtering polls.
  - `end-date` (string, optional, YYYY-MM-DD): End date for filtering polls.
- **Response:**
  - `polls` (array): Array of poll objects with formatted information.

### 8. Submit Poll

- **Endpoint:** `POST /submit-poll`
- **Description:** Submit a user's response to a specific poll.
- **Request Body:**
  - `userId` (number): ID of the user submitting the response.
  - `pollId` (number): ID of the poll being responded to.
  - `selectedOption` (string): Selected option for the question.
  - `questionId` (number): ID of the question being responded to.
- **Response:**
  - `message` (string): Success message.
  - `rewardAmount` (number): Amount of reward for participating.

### 9. Fetch Analytics for a Specified Poll

- **Endpoint:** `GET /poll-analytics`
- **Description:** Fetch analytics for a specific poll.
- **Request Headers:**
  - `poll-id` (number): ID

of the poll for which analytics are requested.

- **Response:**
  - `analytics` (object): Object containing analytics information for the specified poll.

### 10. Fetch Analytics for All Polls

- **Endpoint:** `GET /all-poll-analytics`
- **Description:** Fetch analytics for all polls.
- **Response:**
  - `analytics` (array): Array of poll analytics objects, each containing information for a specific poll.

## Running the Application

1. Install dependencies: `npm install`
2. Set up your MySQL database and update the `.env` file with the database configuration.
3. Run the application: `npm start`
4. The application will be accessible at `http://localhost:3000`.
