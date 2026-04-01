const express = require("express");
const router = express.Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email && password) {
    const testToken = "test-jwt-token";

    return res.status(200).json({
      success: true,
      token: testToken,
      user: {
        email,
        name: "John Doe",
        role: "user",
      },
    });
  }

  return res.status(400).json({
    success: false,
    message: "Invalid email or password.",
  });
});

// Register API
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  if (name && email && password) {
    const testToken = "test-jwt-token";

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      token: testToken,
      user: {
        name,
        email,
        role: "user",
      },
    });
  }

  return res.status(400).json({
    success: false,
    message: "Name, email, and password are required.",
  });
});

module.exports = router;
