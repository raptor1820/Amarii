import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  var token = req.cookies.logged;
  if (!token) res.redirect("/auth");

  try {
    var decoded = jwt.verify(token, process.env.SECRET);
    if (decoded.id != process.env.USER) {
      res.redirect("/auth");
    }
  } catch {
    return res.redirect("/auth");
  }
  next();
};

export default auth;
