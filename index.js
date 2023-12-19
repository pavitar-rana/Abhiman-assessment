import express from "express";

import dotenv from "dotenv";
import mysql from "mysql2";

dotenv.config();

const app = express();
const port = 3000;

// Parse JSON request body
app.use(express.json());

// Create the POOL
const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT,
  })
  .promise();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Route to Create a new Poll

app.post("/create-poll", async (req, res) => {
  // Get poll details
  const { pollTitle, pollCategory, startDate, endDate, minReward, maxReward } =
    req.body;

  // check if all the fields are provided
  if (
    !pollTitle ||
    !pollCategory ||
    !startDate ||
    !endDate ||
    !minReward ||
    !maxReward
  ) {
    return res.status(400).json({
      error:
        "pollTitle, pollCategory, startDate, endDate, minReward and maxReward are required in the request body",
    });
  }

  // check if the types are coreect for each field date will be in YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (
    typeof pollTitle !== "string" ||
    typeof pollCategory !== "string" ||
    typeof startDate !== "string" ||
    !dateRegex.test(startDate) ||
    typeof endDate !== "string" ||
    !dateRegex.test(endDate) ||
    typeof minReward !== "number" ||
    typeof maxReward !== "number"
  ) {
    return res
      .status(400)
      .json({ error: "Invalid data types or formats in request body" });
  }

  try {
    // Inserting a new poll into the POLLS table
    const [result] = await pool.execute(
      "INSERT INTO polls (poll_title, poll_category, start_date, end_date, min_reward, max_reward) VALUES (?, ?, ?, ?, ?, ?)",
      [pollTitle, pollCategory, startDate, endDate, minReward, maxReward]
    );

    const newPollId = result.insertId;
    console.log(`New poll ID: ${newPollId}`);

    res.status(201).json({ message: "New poll created", pollId: newPollId });
  } catch (error) {
    console.error("Error creating a new poll:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to Create a new Question

app.post("/create-question", async (req, res) => {
  const { pollId, questionType, questionText, options, optionVotes } = req.body;

  // Check if all the fields are provided

  if (!pollId || !questionType || !questionText || !options || !optionVotes) {
    return res.status(400).json({
      error:
        "pollId, questionType, questionText, options, and optionVotes are required in the request body",
    });
  }

  // Check if the types are correct for each field

  if (questionType !== "single" && questionType !== "multiple") {
    return res.status(400).json({ error: "Invalid question type" });
  }

  if (
    typeof pollId !== "number" ||
    typeof questionType !== "string" ||
    !Array.isArray(options) ||
    !Array.isArray(optionVotes)
  ) {
    return res
      .status(400)
      .json({ error: "Invalid data types or formats in request body" });
  }

  try {
    // Create a new question and get its ID
    const [questionResult] = await pool.execute(
      "INSERT INTO questions (question_type, question_text, options, optionVotes) VALUES (?, ?, ?, ?)",
      [
        questionType,
        questionText,
        JSON.stringify(options),
        JSON.stringify(optionVotes),
      ]
    );

    const newQuestionId = questionResult.insertId;
    console.log(`New question created with ID: ${newQuestionId}`);

    // Add the question ID to the POLLS table
    const [pollResult] = await pool.execute(
      "SELECT questions FROM polls WHERE id = ?",
      [pollId]
    );

    var existingQuestionIds;

    // Check if 'questions' field is null or undefined
    if (
      pollResult[0].questions === null ||
      pollResult[0].questions === undefined
    ) {
      existingQuestionIds = [];
    } else {
      // console.log("pollResult[0].questions:", pollResult[0].questions);
      existingQuestionIds = pollResult[0].questions;
    }

    // console.log("Existing question IDs:", existingQuestionIds);

    // Add the new question ID to the list
    existingQuestionIds.push(newQuestionId);

    // Update the POLLS table
    await pool.execute("UPDATE polls SET questions = ? WHERE id = ?", [
      JSON.stringify(existingQuestionIds),
      pollId,
    ]);

    res
      .status(200)
      .json({ message: "Question added to poll", questionId: newQuestionId });
  } catch (error) {
    console.error("Error creating question and adding to poll:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to Fetch all Polls

app.get("/all-polls", async (req, res) => {
  try {
    // Get all polls
    const [pollsResult] = await pool.execute("SELECT * FROM polls");

    // If no polls are present
    if (pollsResult.length === 0) {
      return res.status(200).json({ message: "No polls present" });
    }

    // Array to store formatted info for each poll
    const pollsInfo = [];

    // Iterate through each poll and format info
    for (const poll of pollsResult) {
      const pollInfo = {
        pollId: poll.id,
        pollTitle: poll.poll_title,
        pollCategory: poll.poll_category,
        startDate: poll.start_date,
        endDate: poll.end_date,
        totalVotes: poll.total_votes,
        numQuestionSets: 0,
        firstQuestion: null,
      };

      // Get number of question
      const questionSets = poll.questions || [];
      if (poll.questionSets === null) {
        pollInfo.numQuestionSets = 0;
      } else {
        pollInfo.numQuestionSets = questionSets.length;
      }

      // If there are question then get details of the first question
      if (pollInfo.numQuestionSets > 0) {
        const firstQuestionId = questionSets[0];
        const [questionResult] = await pool.execute(
          "SELECT * FROM questions WHERE id = ?",
          [firstQuestionId]
        );
        console.log("Question result:", questionResult);

        // Check if questionResult is defined and not empty
        if (questionResult && questionResult[0]) {
          // Add details of the question in response
          pollInfo.firstQuestion = {
            questionId: firstQuestionId,
            questionText: questionResult[0].question_text,
            options: questionResult[0].options,
          };
        }
      }
      // Add poll info to the array
      pollsInfo.push(pollInfo);
    }

    res.status(200).json({ polls: pollsInfo });
  } catch (error) {
    console.error("Error retrieving list of polls:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to Update Poll using Poll ID
app.put("/update-poll", async (req, res) => {
  const { pollId, title, category, minReward, maxReward, startDate, endDate } =
    req.body;

  // Check if pollId is provided in the request body
  if (!pollId) {
    return res
      .status(400)
      .json({ error: "Poll ID is required in the request body" });
  }

  try {
    // Check if the specified poll exists
    const [pollResult] = await pool.execute(
      "SELECT COUNT(*) AS count FROM polls WHERE id = ?",
      [pollId]
    );

    if (pollResult[0].count === 0) {
      return res.status(404).json({ error: "Poll not found" });
    }

    // Construct the SQL query based on the provided parameters
    const updateFields = [];
    const values = [];

    if (title !== undefined) {
      updateFields.push("poll_title = ?");
      values.push(title);
    }

    if (category !== undefined) {
      updateFields.push("poll_category = ?");
      values.push(category);
    }

    if (minReward !== undefined) {
      updateFields.push("min_reward = ?");
      values.push(minReward);
    }

    if (maxReward !== undefined) {
      updateFields.push("max_reward = ?");
      values.push(maxReward);
    }

    if (startDate !== undefined) {
      updateFields.push("start_date = ?");
      values.push(startDate);
    }

    if (endDate !== undefined) {
      updateFields.push("end_date = ?");
      values.push(endDate);
    }

    // If there are fields to update, combine them into a string
    if (updateFields.length > 0) {
      const updateSetClause = updateFields.join(",");
      const updateQuery = `UPDATE polls SET ${updateSetClause} WHERE id = ?`;
      values.push(pollId);

      try {
        const [result] = await pool.execute(updateQuery, values);

        if (result.affectedRows > 0) {
          return res.status(200).json({ message: "Poll updated successfully" });
        } else {
          return res.status(500).json({ error: "Failed to update poll" });
        }
      } catch (error) {
        console.error("Error updating poll:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }
    } else {
      // No fields to update
      return res
        .status(400)
        .json({ error: "No valid fields provided for update" });
    }
  } catch (error) {
    console.error("Error checking poll existence:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

//Route to update question
app.put("/update-question", async (req, res) => {
  const { questionId, questionText, options, questionType, optionVotes } =
    req.body;

  // Check if questionId is provided in the request body
  if (!questionId) {
    return res
      .status(400)
      .json({ error: "Question ID is required in the request body" });
  }

  try {
    // Check if the specified question set exists
    const [result] = await pool.execute(
      "SELECT COUNT(*) AS count FROM questions WHERE id = ?",
      [questionId]
    );

    if (result[0].count === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Construct the SQL query based on the provided parameters
    const updateFields = [];
    const values = [];

    if (questionText !== undefined) {
      updateFields.push("question_text = ?");
      values.push(questionText);
    }

    if (options !== undefined) {
      updateFields.push("options = ?");
      values.push(JSON.stringify(options));
    }

    if (questionType !== undefined) {
      updateFields.push("question_type = ?");
      values.push(questionType);
    }

    if (optionVotes !== undefined) {
      updateFields.push("optionVotes = ?");
      values.push(JSON.stringify(optionVotes));
    }

    // If there are fields to update, combine them into a string
    if (updateFields.length > 0) {
      const updateSetClause = updateFields.join(",");
      const updateQuery = `UPDATE questions SET ${updateSetClause} WHERE id = ?`;
      values.push(questionId);

      const [updateResult] = await pool.execute(updateQuery, values);

      if (updateResult.affectedRows > 0) {
        return res
          .status(200)
          .json({ message: "Question updated successfully" });
      } else {
        return res.status(500).json({ error: "Failed to update question" });
      }
    } else {
      // No fields to update
      return res
        .status(400)
        .json({ error: "No valid fields provided for update" });
    }
  } catch (error) {
    console.error("Error updating question:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/create-user", async (req, res) => {
  const { username } = req.body;

  // Check if username is provided in the request body
  if (!username) {
    return res
      .status(400)
      .json({ error: "Username is required in the request body" });
  }

  try {
    // Insert the new user into the database
    const insertQuery = "INSERT INTO users (name) VALUES (?)";
    const [result] = await pool.execute(insertQuery, [username]);
    console.log("Result:", result);
    if (result.insertId) {
      return res.status(201).json({
        userId: result.insertId,
        message: "User created successfully",
      });
    } else {
      return res.status(500).json({ error: "Failed to create user" });
    }
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

//Routs to fetch user info using user id

// Route to fetch polls for a user
app.get("/user-poll-info", async (req, res) => {
  const userId = req.headers["user-id"];
  const startDate = req.headers["start-date"];
  const endDate = req.headers["end-date"];

  // Check if userId is provided in the query parameters
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    // Check if the user exists
    const [userResult] = await pool.execute(
      "SELECT COUNT(*) AS count FROM users WHERE id = ?",
      [userId]
    );

    if (userResult[0].count === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch the user's attempted polls and questions
    const [userResultData] = await pool.execute(
      "SELECT polls_id_attempted, question_id_attempted FROM users WHERE id = ?",
      [userId]
    );

    const pollsAttempted = userResultData[0].polls_id_attempted || [];
    const questionIdAttempted = userResultData[0].question_id_attempted || [];

    // Construct the condition for optional date range
    const dateRangeCondition =
      startDate && endDate ? "AND start_date >= ? AND end_date <= ?" : "";

    // Fetch polls based on optional date range
    const [pollsResult] = await pool.execute(
      `SELECT * FROM polls WHERE id NOT IN (?) ${dateRangeCondition}`,
      [pollsAttempted, startDate, endDate].filter(Boolean)
    );

    // If no polls are present
    if (pollsResult.length === 0) {
      return res.status(200).json({ message: "No new polls exist" });
    }

    // Array to store formatted info for each poll
    const pollsInfo = [];

    // Iterate through each poll and format info
    for (const poll of pollsResult) {
      const pollInfo = {
        pollTitle: poll.poll_title,
        pollCategory: poll.poll_category,
        startDate: poll.start_date,
        endDate: poll.end_date,
        totalVotes: 0,
        numQuestionSets: 0,
        firstQuestion: null,
      };

      // Get number of question sets
      const questionSets = poll.questions || [];
      pollInfo.numQuestionSets = questionSets.length;

      // If there are questions, find the first unanswered question
      if (pollInfo.numQuestionSets > 0) {
        const unansweredQuestion = questionSets.find(
          (questionId) => !questionIdAttempted.includes(questionId)
        );

        if (unansweredQuestion) {
          const [questionResult] = await pool.execute(
            "SELECT * FROM questions WHERE id = ?",
            [unansweredQuestion]
          );

          // Check if questionResult is defined and not empty
          if (questionResult && questionResult[0]) {
            // Add details of the question in response
            pollInfo.firstQuestion = {
              questionId: unansweredQuestion,
              questionText: questionResult[0].question_text,
              options: questionResult[0].options,
            };
          }
        }
      }
      // Add poll info to the array
      pollsInfo.push(pollInfo);
    }

    res.status(200).json({ polls: pollsInfo });
  } catch (error) {
    console.error("Error fetching user poll info:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to submit a poll
app.post("/submit-poll", async (req, res) => {
  const { userId, pollId, selectedOption, questionId } = req.body;

  // Check if userId, pollId, and selectedOption are provided in the request body
  if (!userId || !pollId || !selectedOption || !questionId) {
    return res.status(400).json({
      error:
        "UserId, pollId, questionId and selectedOption are required in the request body",
    });
  }

  try {
    // Fetch existing poll data
    const [pollResult] = await pool.execute(
      "SELECT * FROM polls WHERE id = ?",
      [pollId]
    );

    if (pollResult.length === 0) {
      return res.status(404).json({ error: "Poll not found" });
    }

    const existingPoll = pollResult[0];

    const [questionResult] = await pool.execute(
      "SELECT * FROM questions WHERE id = ?",
      [questionId]
    );
    const [userResult] = await pool.execute(
      "SELECT * FROM users WHERE id = ?",
      [userId]
    );
    console.log("User result:", userResult);

    const { question_attempted, polls_attempted } = userResult[0];

    const question_id_attempted = userResult[0].question_id_attempted || [];
    const polls_id_attempted = userResult[0].polls_id_attempted || [];

    if (!userResult || userResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Selected option:", selectedOption);
    console.log("Question result:", questionResult);

    // Find the selected option in the options array
    const selectedOptionIndex = questionResult[0].options.findIndex(
      (option) => option === selectedOption
    );

    console.log("Selected option index:", selectedOptionIndex);

    if (selectedOptionIndex === -1) {
      return res.status(400).json({ error: "Invalid option selected" });
    }

    //check is question id attempted is null

    // Increment the count for the selected option
    let optionVotes = questionResult[0].optionVotes;
    optionVotes[selectedOptionIndex] += 1;

    polls_id_attempted.push(pollId);
    question_id_attempted.push(questionId);

    // Convert the updated options data to JSON
    const updatedOptionsJSON = JSON.stringify(optionVotes);

    // Update the questions table with the updated options data
    await pool.execute("UPDATE questions SET optionVotes = ? WHERE id = ?", [
      updatedOptionsJSON,
      questionId,
    ]);

    // Update user data to indicate that they have completed the question
    await pool.execute(
      "UPDATE users SET question_attempted = ?, polls_attempted = ?, question_id_attempted = ?, polls_id_attempted = ? WHERE id = ?",
      [
        question_attempted + 1,
        polls_attempted + 1,
        JSON.stringify(question_id_attempted),
        JSON.stringify(polls_id_attempted),
        userId,
      ]
    );

    // update the polls table and increase the total poll by 1
    await pool.execute(
      "UPDATE polls SET total_votes = total_votes + 1 WHERE id = ?",
      [pollId]
    );

    // Calculate a reward amount for the user within the range of min and max rewards
    const rewardAmount =
      existingPoll.min_reward +
      Math.floor(
        Math.random() * (existingPoll.max_reward - existingPoll.min_reward)
      );

    // Return the reward amount and any other response data
    res
      .status(200)
      .json({ message: "Poll submitted successfully", rewardAmount });
  } catch (error) {
    console.error("Error submitting poll:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to fetch analytics for a specified poll

app.get("/poll-analytics", async (req, res) => {
  const pollId = req.headers["poll-id"];

  try {
    // Fetch the poll details
    const [pollResult] = await pool.execute(
      "SELECT * FROM polls WHERE id = ?",
      [pollId]
    );

    // Check if the poll exists
    if (!pollResult[0]) {
      return res.status(404).json({ error: "Poll not found" });
    }

    const poll = pollResult[0];
    const questions = poll.questions || [];
    const totalVotes = poll.total_votes || 0;
    const pollName = poll.poll_title;
    // Prepare a map to store counts for each option
    const questionana = [];

    // Iterate through each instance of a question in the poll
    for (let i = 0; i < questions.length; i++) {
      const questionId = questions[i];

      // Fetch the question details
      const [questionResult] = await pool.execute(
        "SELECT * FROM questions WHERE id = ?",
        [questionId]
      );
      const indiquestion = {};
      indiquestion.questionId = questionId;
      indiquestion.questionText = questionResult[0].question_text;
      const optionCounts = {};

      // Check if the question exists
      if (questionResult[0]) {
        const question = questionResult[0];
        const options = question.options || [];
        const optionVotes = question.optionVotes || [];

        // Initialize counts for each option
        for (const option of options) {
          const optionIndex = options.indexOf(option);
          const optionKey = `Q${questionId}_${option}`; // Use index to differentiate duplicate questions
          optionCounts[optionKey] = optionVotes[optionIndex] || 0;
        }
      }
      indiquestion.options = optionCounts;
      questionana.push(indiquestion);
    }

    // Respond with the analytics data
    res.status(200).json({
      analytics: { pollId, pollName, totalVotes, questions: questionana },
    });
  } catch (error) {
    console.error("Error fetching poll analytics:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to fetch analytics for all polls
app.get("/all-poll-analytics", async (req, res) => {
  try {
    // Fetch all polls
    const [allPolls] = await pool.execute("SELECT * FROM polls");

    // Check if there are polls
    if (!allPolls || allPolls.length === 0) {
      return res.status(404).json({ error: "No polls found" });
    }

    // Prepare an array to store analytics for each poll
    const allPollAnalytics = [];

    // Iterate through each poll
    for (const poll of allPolls) {
      const pollId = poll.id;
      const questions = poll.questions || [];
      const totalVotes = poll.total_votes || 0;
      const pollName = poll.poll_title;

      // Prepare an array to store analytics for each question in the poll
      const questionAnalytics = [];

      // Iterate through each question in the poll
      for (let i = 0; i < questions.length; i++) {
        const questionId = questions[i];

        // Fetch the question details
        const [questionResult] = await pool.execute(
          "SELECT * FROM questions WHERE id = ?",
          [questionId]
        );

        // Check if the question exists
        if (questionResult[0]) {
          const question = questionResult[0];
          const options = question.options || [];
          const optionVotes = question.optionVotes || [];

          // Prepare an object to store analytics for each option in the question
          const optionCounts = {};

          // Initialize counts for each option
          for (const option of options) {
            const optionIndex = options.indexOf(option);
            const optionKey = `Q${questionId}_${option}`; // Use index to differentiate duplicate questions
            optionCounts[optionKey] = optionVotes[optionIndex] || 0;
          }

          // Add question analytics to the array
          questionAnalytics.push({
            questionId,
            questionText: question.question_text,
            options: optionCounts,
          });
        }
      }

      // Add poll analytics to the array
      allPollAnalytics.push({
        pollId,
        pollName,
        totalVotes,
        questions: questionAnalytics,
      });
    }

    // Respond with the analytics data for all polls
    res.status(200).json({ analytics: allPollAnalytics });
  } catch (error) {
    console.error("Error fetching poll analytics:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
