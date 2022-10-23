const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let database = null;
const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000");
    });
  } catch (err) {
    console.log(`DB Error: ${err.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// conversion of columns into response format
const convertTodoTable = (todoOb) => {
  return {
    id: todoOb.id,
    todo: todoOb.todo,
    category: todoOb.category,
    priority: todoOb.priority,
    status: todoOb.status,
    dueDate: todoOb.due_date,
  };
};
//check for validity of columns
const isValidStatus = (status) => {
  return ["TO DO", "IN PROGRESS", "DONE"].includes(status);
};
const isValidPriority = (priority) => {
  return ["HIGH", "MEDIUM", "LOW"].includes(priority);
};
const isValidCategory = (category) => {
  return ["WORK", "HOME", "LEARNING"].includes(category);
};
// const isValidDate = (date) => {
//   const dt = new Date(date);
//   return isValid(dt);
// };
const validateQueryDetails = (request, response, next) => {
  const { status, category, priority, date, search_q } = request.query;
  const dt = new Date(date);
  switch (true) {
    case status !== undefined && isValidStatus(status) === false:
      response.status(400);
      response.send("Invalid Todo Status");
      break;
    case priority !== undefined && isValidPriority(priority) === false:
      response.status(400);
      response.send("Invalid Todo Priority");
      break;
    case category !== undefined && isValidCategory(category) === false:
      response.status(400);
      response.send("Invalid Todo Category");
      break;
    case date !== undefined && isValid(dt) === false:
      response.status(400);
      response.send("Invalid Due Date");
      break;
    default:
      next();
      break;
  }
};
const validateBodyDetails = (request, response, next) => {
  const { status, category, priority, dueDate } = request.body;
  const dt = new Date(dueDate);
  switch (true) {
    case status !== undefined && isValidStatus(status) === false:
      response.status(400);
      response.send("Invalid Todo Status");
      break;
    case priority !== undefined && isValidPriority(priority) === false:
      response.status(400);
      response.send("Invalid Todo Priority");
      break;
    case category !== undefined && isValidCategory(category) === false:
      response.status(400);
      response.send("Invalid Todo Category");
      break;
    case dueDate !== undefined && isValid(dt) === false:
      response.status(400);
      response.send("Invalid Due Date");
      break;
    default:
      next();
      break;
  }
};

// API to get list of todos
app.get("/todos/", validateQueryDetails, async (request, response) => {
  const {
    status = "",
    category = "",
    priority = "",
    search_q = "",
  } = request.query;
  const getQuery = `SELECT * FROM todo
          WHERE status LIKE '%${status}%' AND
          priority LIKE '%${priority}%' AND
          category LIKE '%${category}%' AND
          todo LIKE '%${search_q}%';`;
  const todoList = await database.all(getQuery);
  response.send(todoList.map((eachTodo) => convertTodoTable(eachTodo)));
});
// API to get a specific todo
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT * FROM todo
    WHERE id = ${todoId};`;

  const todo = await database.get(getTodoQuery);
  response.send(convertTodoTable(todo));
});
//API to get list of all todos with a specific due date
app.get("/agenda/", validateQueryDetails, async (request, response) => {
  const { date } = request.query;
  const newDate = new Date(date);
  const dateFormat = format(new Date(newDate), "yyyy-MM-dd");
  const getDueDateQuery = `
        SELECT * FROM todo
        WHERE due_date = '${dateFormat}'`;
  const todoList = await database.all(getDueDateQuery);
  response.send(todoList.map((eachTodo) => convertTodoTable(eachTodo)));
});

//API to create todo
app.post("/todos/", validateBodyDetails, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const dateFormat = format(new Date(dueDate), "yyyy-MM-dd");
  const getCreateQuery = `INSERT INTO todo 
        (id,todo,priority,status,category,due_date) 
        VALUES ('${id}',
             '${todo}',
             '${priority}',
             '${status}',
             '${category}',
             '${dateFormat}');`;
  await database.run(getCreateQuery);
  response.send("Todo Successfully Added");
});

//API to update todo

app.put("/todos/:todoId/", validateBodyDetails, async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  let updateColumn = "";
  if (requestBody.status !== undefined) {
    updateColumn = "Status";
  }
  if (requestBody.priority !== undefined) {
    updateColumn = "Priority";
  }
  if (requestBody.category !== undefined) {
    updateColumn = "Category";
  }
  if (requestBody.dueDate !== undefined) {
    updateColumn = "Due Date";
  }
  if (requestBody.todo !== undefined) {
    updateColumn = "Todo";
  }

  const getPreviousTodoQuery = `
        SELECT * FROM todo WHERE id = ${todoId};`;
  const previousTodo = await database.get(getPreviousTodoQuery);
  const {
    todo = previousTodo.todo,
    status = previousTodo.status,
    priority = previousTodo.priority,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;
  const getUpdateQuery = `UPDATE todo 
        SET todo = '${todo}',
        status = '${status}',
        priority = '${priority}',
        category = '${category}',
        due_date = '${dueDate}';`;
  await database.run(getUpdateQuery);
  response.send(`${updateColumn} Updated`);
});

// API to delete a todo
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getDeleteQuery = `DELETE FROM todo WHERE id = ${todoId};`;
  await database.run(getDeleteQuery);
  response.send("Todo Deleted");
});
module.exports = app;
