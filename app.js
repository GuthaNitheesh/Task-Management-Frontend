import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import TaskPage from "./pages/TaskPage";
import ContactPage from "./pages/ContactPage";

const App = () => {
  const [currUser, setCurrUser] = useState(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const fullName = localStorage.getItem("fullName");
    const email = localStorage.getItem("email"); // ✅ include email

    if (isLoggedIn) {
      return {
        isLoggedIn: true,
        fullName: fullName || "Guest",
        email: email || "", // ✅ add to state
      };
    } else {
      return {
        isLoggedIn: false,
        fullName: "Guest",
        email: "",
      };
    }
  });

  const afterLogin = (respObj) => {
    const newStateOfUser = {
      isLoggedIn: true,
      fullName: respObj.data.user.fullName,
      email: respObj.data.user.email, // ✅ store email after login
    };

    localStorage.setItem("isLoggedIn", true);
    localStorage.setItem("fullName", respObj.data.user.fullName);
    localStorage.setItem("email", respObj.data.user.email); // ✅ save to localStorage
    setCurrUser(newStateOfUser);
  };

  const getLoggedInUserInfo = async () => {
    try {
      const resp = await fetch(import.meta.env.VITE_BACKEND_URL + "/users/me", {
        method: "GET",
        credentials: "include",
      });
      const resObj = await resp.json();

      if (resObj.status === "success") {
        setCurrUser({
          isLoggedIn: true,
          fullName: resObj.data.user.fullName,
          email: resObj.data.user.email, // ✅ store from session check
        });
        localStorage.setItem("isLoggedIn", true);
        localStorage.setItem("fullName", resObj.data.user.fullName);
        localStorage.setItem("email", resObj.data.user.email); // ✅
      } else {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("fullName");
        localStorage.removeItem("email"); // ✅ clear email too
        setCurrUser({ isLoggedIn: false, fullName: "Guest", email: "" });
      }
    } catch (error) {
      console.log("Error checking user session:", error.message);
    }
  };

  useEffect(() => {
    if (currUser.isLoggedIn) {
      getLoggedInUserInfo();
    }
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("fullName");
    localStorage.removeItem("email"); // ✅ clear email

    try {
      const resp = await fetch(import.meta.env.VITE_BACKEND_URL + "/users/logout", {
        method: "POST",
        credentials: "include",
      });
      const respObj = await resp.json();

      if (respObj.status === "success") {
        setCurrUser({
          isLoggedIn: false,
          fullName: "Guest",
          email: "",
        });
      } else {
        alert("Error in Logout: " + respObj.message);
      }
    } catch (error) {
      alert("Logout request failed: " + error.message);
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            currUser.isLoggedIn ? (
              <HomePage currUser={currUser} handleLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/login"
          element={
            currUser.isLoggedIn ? (
              <Navigate to="/" />
            ) : (
              <LoginPage afterLogin={afterLogin} />
            )
          }
        />

        <Route
          path="/sign-up"
          element={currUser.isLoggedIn ? <Navigate to="/" /> : <SignUpPage />}
        />

        <Route
          path="/tasks"
          element={
            currUser.isLoggedIn ? (
              <TaskPage currUser={currUser} handleLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/contact"
          element={
            currUser.isLoggedIn ? (
              <ContactPage currUser={currUser} handleLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="*"
          element={
            <div>
              Page Not Found. <Link to="/">Go Home</Link>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
