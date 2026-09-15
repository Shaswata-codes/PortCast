import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'portcast_jwt_secret_key_2026_shipping';
  return jwt.sign({ id }, secret, {
    expiresIn: '30d',
  });
};

export default generateToken;
