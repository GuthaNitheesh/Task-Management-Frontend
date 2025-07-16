require("dotenv").config(); // it attaches the .env key values in the process variable that we cn now use anywhere as we require
require("./config/dbConfig.js"); // (when ever you require the file, it runs that file.) it will connect the mongoose to our MONGO DB Atlas Database and then we can use the mongoose from here on to do DB stuff
const PORT = process.env.PORT || 1814; // we are attaching a fallback PORT incase if port is not mentioned in the .env file
const express = require("express"); // we will be using express framework for our backend app
const morgan = require("morgan"); // we import a third party library for better logs on console
const cors = require("cors"); // this allow the browser to enable frontend to connect to backend by giving such permissions
const User = require("./models/userModel.js");
const { generateOTP } = require("./utils/otpHelpers.js");
const { sendOtpEmail, sendReminderMail } = require("./utils/emailHelpers.js");
const OTP = require("./models/otpModel.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const Task = require("./models/taskModel.js");


require("./cron/taskReminderCron");
// --------------------------------------------------------------
const app = express(); // we are creating a server using express
// --------------------------------------------------------------

app.use(morgan("dev")); // this is a third-party middleware (written by someone else) which logs the request to console in better way

// app.use(cors()); // this code actually allows all origins / domains to talk with backend
app.use(
    cors({

        origin: process.env.FRONTEND_URL,
        credentials: true,
    })
); // this code allows only the frontend with origin "http://localhost:5173" to talk with backend and
// also allows him to send and receive the cookies

app.use(express.json()); // this will read the request body stream and serializes it into javascript object and attach it on the req object :: req.body

app.use((req, res, next) => {
    console.log("=> Request received -->", req.url);
    next();
}); // this is a very basic middleware which logs the request to console

// health check, or basically to check if server is working fine
app.get("/", (req, res) => {
    res.send("<h1>Server is working fine ...</h1>");
});

// document.addEventListener("click", (ev)=>{ev.target.styles.backgroundColor = 'red'})
// request handler for the endpoint with particular http verb or method
app.get("/users", (req, res) => {
    try {
        // we will complete it after sometime
    } catch (err) {
        console.log("Error in GET /users");
        console.log(err.message);
        res.status(500);
        res.json({
            status: "fail",
            message: "Internal Server Error " + err.message,
        });
    }
});

// request handler for the endpoint with particular http verb or method
/*
 * creates a new user after validating the OTP against email
 * it stores the password in secured way
 */

app.post("/users/register", async (req, res) => {
    try {
        const { email, password, otp, fullName } = req.body; // this is from user request

        // get the otpDoc corresponding to given email from DB
        // find --> array of documents and its length is >=0
        // findOne --> doc or null
        const otpDoc = await OTP.findOne({
            email: email,
        }).sort("-createdAt"); // https://mongoosejs.com/docs/api/query.html

        // check if the otp was sent to email or not
        if (!otpDoc) {
            res.status(400);
            res.json({
                status: "fail",
                message: "Either OTP is not sent to the given email or it is expired! Please try again!",
            });
            return;
        }

        const { otp: hashedOtp } = otpDoc; // renaming otp to hashedOtp to avoid conflict in variable names

        // verify if the otp is correct
        const isOtpCorrect = await bcrypt.compare(otp.toString(), hashedOtp);
        if (!isOtpCorrect) {
            res.status(401);
            res.json({
                status: "fail",
                message: "Invalid OTP !",
            });
            return;
        }

        // store the password securely
        const hashedPassword = await bcrypt.hash(password, 14);

        const newUser = await User.create({
            email,
            password: hashedPassword,
            fullName,
        }); // put user data in database

        res.status(201);
        res.json({
            status: "success",
            data: {
                user: {
                    email: newUser.email,
                    fullName: newUser.fullName,
                },
            },
        });
    } catch (err) {
        console.log("--- Error in /POST users ---");
        console.log(err.name, err.code);
        console.log(err.message);
        if (err.name === "ValidationError") {
            // mistake of client that he has not sent the valid data
            res.status(400);
            res.json({
                status: "fail",
                message: "Data validation failed: " + err.message,
            });
        } else if (err.code === 11000) {
            // mistake of client that he is using the email which already registered
            res.status(400);
            res.json({
                status: "fail",
                message: "Email already exists!",
            });
        } else {
            // generic mistake by server
            res.status(500);
            res.json({
                status: "fail",
                message: "Internal Server Error",
            });
        }
    }
});

// request handler to send otp for given email
//TODO: Add try catch
app.post("/otps", async (req, res) => {
    const { email } = req.body;

    // 1. Validate email presence
    if (!email) {
        return res.status(400).json({
            status: "fail",
            message: 'Missing required parameter: "email"',
        });
    }

    try {
        // 2. ✅ Check if OTP already sent in last 3 minutes
        const existingRecentOtp = await OTP.findOne({
            email,
            createdAt: { $gte: new Date(Date.now() - 3 * 60 * 1000) } // last 3 minutes
        });

        if (existingRecentOtp) {
            return res.status(429).json({
                status: "fail",
                message: "OTP already sent recently. Please try again later.",
            });
        }

        // 3. Generate OTP
        const otp = generateOTP();

        // 4. Send OTP via email
        const isEmailSent = await sendOtpEmail(email, otp);
        if (!isEmailSent) {
            return res.status(500).json({
                status: "fail",
                message: "Email could not be sent! Please try again after 30 seconds!",
            });
        }

        // 5. Store hashed OTP in DB
        const newSalt = await bcrypt.genSalt(14);
        const hashedOtp = await bcrypt.hash(otp.toString(), newSalt);

        await OTP.create({
            email,
            otp: hashedOtp,
        });

        // 6. Send Success Response
        res.status(201).json({
            status: "success",
            message: `OTP sent to ${email}`,
        });

    } catch (err) {
        console.log("Error in POST /otps", err.message);
        res.status(500).json({
            status: "fail",
            message: "Internal Server Error",
        });
    }
});

/*
    1. validate the password against user account
    2. issue a JWT token in the cookie
*/
app.post("/users/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: "fail",
                message: "Email and password are required!",
            });
        }

        const currUser = await User.findOne({ email: email });

        if (!currUser) {
            return res.status(400).json({
                status: "fail",
                message: "User is not registered!",
            });
        }

        const { password: hashedPassword, fullName, _id } = currUser;
        const isPasswordCorrect = await bcrypt.compare(password, hashedPassword);

        if (!isPasswordCorrect) {
            return res.status(401).json({
                status: "fail",
                message: "Invalid email or password!",
            });
        }

        const token = jwt.sign(
            { email, _id, fullName },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "1d" }
        );

        // ✅ Fix applied here: set cookie for localhost (non-HTTPS)
        res.cookie("authorization", token, {
            httpOnly: true,
            secure: false,       // ✅ Accepts cookies over HTTP on localhost
            sameSite: "lax",     // ✅ Works safely on same-origin
        });



        return res.status(200).json({
            status: "success",
            message: "User logged in",
            data: {
                user: {
                    email,
                    fullName,
                },
            },
        });

    } catch (err) {
        console.error("Error in login:", err.message);
        return res.status(500).json({
            status: "fail",
            message: "Internal Server Error",
        });
    }
});


/* 
    middleware to authorize the user 
*/

app.use(cookieParser()); // it reads the cookies and add them to req object :: req.cookies

app.use((req, res, next) => {
  try {
    const { authorization } = req.cookies;
    console.log("Cookies received from client:", authorization);

    if (!authorization) {
      return res.status(401).json({
        status: "fail",
        message: "Authorization failed! No token provided.",
      });
    }

    jwt.verify(authorization, process.env.JWT_SECRET_KEY, (error, data) => {
      if (error) {
        // 🔴 ✅ ADD THIS:
        console.log("🔴 JWT verification failed:", error.message);

        return res.status(401).json({
          status: "fail",
          message: "Authorization failed! " + error.message,
        });
      }

      // ✅ If everything is fine
      console.log("✅ JWT verified. User:", data.fullName);
      req.currUser = data;
      next();
    });
  } catch (err) {
    console.log("Error in validation middleware", err.message);
    res.status(500).json({
      status: "fail",
      message: "Internal Server Error",
    });
  }
});



// CREATEs a task
app.post("/tasks", async (req, res) => {
    try {
        // 1. get the data from request
        const taskInfo = req.body;
        const { email } = req.currUser;

        // 2. validate the data :: now mongoose does that
        // 3. save the data in db :: MongoDB (online --> ATLAS) (offline is pain to setup :: in deployment we will mostly prefer online)
        const newTask = await Task.create({
            ...taskInfo,
            assignor: email,
        });

        res.status(201); //created
        res.json({
            status: "success",
            data: {
                task: newTask,
            },
        });
    } catch (err) {
        console.log("Error in POST /tasks", err.message);
        if (err.name === "ValidationError") {
            res.status(400).json({ status: "fail", message: err.message });
        } else if (err.code === 11000) {
            res.status(400).json({ status: "fail", message: err.message });
        } else {
            res.status(500).json({ status: "fail", message: "Internal Server Error" });
        }
    }
});

app.get("/users/me", (req, res) => {
    try {
        console.log("/userme");
        const { email, fullName } = req.currUser;
        res.status(200);
        res.json({
            status: "success",
            data: {
                user: {
                    email,
                    fullName,
                },
            },
        });
    } catch (err) {
        console.log("error is GET /users/me", err.message);
        res.status(500);
        res.json({
            status: "fail",
            message: "INTERNAL SERVER ERROR",
        });
    }
});


app.get("/tasks", async (req, res) => {
    try {
        const { priority } = req.query;
        const userEmail = req.currUser.email;

        const filter = {
            $or: [{ assignor: userEmail }, { assignee: userEmail }],
        };

        // ✅ Add priority filter if provided
        if (priority) {
            filter.priority = priority;
        }

        const taskList = await Task.find(filter);
        res.status(200).json({
            status: "success",
            data: {
                tasks: taskList,
            },
        });
    } catch (err) {
        console.log("error in GET /tasks", err.message);
        res.status(500).json({
            status: "fail",
            message: "INTERNAL SERVER ERROR",
        });
    }
});

app.patch("/tasks/:taskId", async (req, res) => {
    try {
        const { taskId } = req.params;
        const { workTitle, assignee, priority, status } = req.body;
        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            { workTitle, assignee, priority, status },
            { returnDocument: "after", runValidators: true }
        );
        if (!updatedTask) {
            res.status(400).json({ status: "fail", message: "Task not found" });
            return;
        }
        res.status(200).json({ status: "success", data: { task: updatedTask } });
    } catch (err) {
        if (err.name === "CastError") {
            res.status(400).json({ status: "fail", message: "Invalid Task ID" });
        } else {
            res.status(500).json({ status: "fail", message: "Internal Server Error" });
        }
    }
});


app.delete("/tasks/:taskId", async (req, res) => {
    try {
        const { taskId } = req.params;
        const result = await Task.findByIdAndDelete(taskId);
        if (result === null) {
            res.status(400).json({
                status: "fail",
                message: "Task ID does not exists!",
            });
        } else {
            res.status(204).json({
                status: "success",
                data: {
                    result,
                },
            });
        }
    } catch (err) {
        console.log(err.message);
        if (err.name == "CastError") {
            res.status(400).json({
                status: "fail",
                message: "Invalid parameter",
            });
        } else {
            res.status(500).json({
                status: "fail",
                message: "Internal Server Error",
            });
        }
    }
});


app.get("/users/logout", (req, res) => {
    try {
        res.clearCookie("authorization");
        res.json({
            status: "success",
            message: "User is logged out!",
        });
    } catch (err) {
        res.status(500).json({
            status: "fail",
            message: "Something went wrong during logout",
        });
    }
});


// --------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`--------- Server Started on PORT: ${PORT} ---------`);
}); // we are attaching that server to a active port to listen to requests and respond to them

