const router = require('express').Router();
const usersController = require('../controllers/users');
const {
  userInfoValidation,
} = require('../middlewares/validate');

router.get('/me', usersController.getUser);
router.patch('/me', userInfoValidation, usersController.updateUser);

module.exports = router;
