const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { NODE_ENV, SECRET_KEY } = process.env;
const NotFoundError = require('../utils/errors/NotFoundError');
const BadRequestError = require('../utils/errors/BadRequestError');
const ConflictError = require('../utils/errors/ConflictError');

const userModel = require('../models/user');
const {
  MONGO_DUPLICATE_KEY_ERROR,
  SALT_ROUNDS,
} = require('../utils/constants');

const getUser = (req, res, next) => {
  userModel
    .findById(req.user._id)
    .orFail()
    .then((user) => {
      res.send(user);
    })
    .catch((err) => {
      if (err.name === 'DocumentNotFoundError') {
        throw new NotFoundError('Пользователь с указанным _id не найден');
      }
      if (err.name === 'CastError') {
        throw new BadRequestError('Пользователя с указанным _id не существует');
      }
      return next(err);
    });
};

const updateUser = (req, res, next) => {
  const { name, email } = req.body;
  userModel
    .findByIdAndUpdate(
      req.user._id,
      { name, email },
      {
        new: true, // обработчик then получит на вход обновленную запись
        runValidators: true, // данные будут валидированы перед изменением
      },
    )
    .orFail(() => {
      throw new NotFoundError('Пользователь с указанным _id не найден');
    })
    .then((user) => {
      res.send(user);
    })
    .catch((err) => {
      if (err.name === 'ValidationError') {
        throw new BadRequestError(
          'Указаны некорректные данные при обновлении профиля',
        );
      }
      return next(err);
    });
};

const registerUser = (req, res, next) => {
  const {
    name, email, password,
  } = req.body;

  bcrypt
    .hash(password, SALT_ROUNDS)
    .then((hash) => {
      userModel
        .create({
          name,
          email,
          password: hash,
        })
        .then((user) => {
          res.status(201).send({
            _id: user._id,
            name: user.name,
            email: user.email,
          });
        })
        .catch((err) => {
          if (err.code === MONGO_DUPLICATE_KEY_ERROR) {
            return next(
              new ConflictError(
                'Указанный email уже используется другим пользователем',
              ),
            );
          }
          if (err.name === 'ValidationError') {
            return next(
              new BadRequestError(
                'Указаны некорректные данные при создании пользователя',
              ),
            );
          }
          return next(err);
        });
    })
    .catch(next);
};

const loginUser = (req, res, next) => {
  const { email, password } = req.body;

  userModel
    .findUserByCredentials(email, password)
    .then((user) => {
      const token = jwt.sign({ _id: user._id }, NODE_ENV === 'production' ? SECRET_KEY : 'dev-secret', {
        expiresIn: '7d',
      });
      res.send({ token });
    })
    .catch(next);
};

module.exports = {
  getUser,
  updateUser,
  registerUser,
  loginUser,
};
