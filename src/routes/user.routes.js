const express = require("express");
const { body } = require("express-validator");
const { addBalance } = require("../controllers/user.controller");
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

router.use(authenticate);

// POST /api/user/wallet/add
router.post(
  "/wallet/add",
  [
    body("amount")
      .isFloat({ min: 1 })
      .withMessage("En az 1 TL yükleyebilirsiniz"),
  ],
  addBalance
);

module.exports = router;
